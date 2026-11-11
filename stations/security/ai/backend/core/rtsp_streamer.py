"""Shared, bounded RTSP readers. Each reader retains only the newest frame."""
import json
import logging
import math
import os
import re
import struct
import threading
import time
import random
import atexit
from collections import deque

import cv2
import numpy as np
from config.database import get_db_general_connection

os.environ.setdefault("OPENCV_FFMPEG_CAPTURE_OPTIONS", "rtsp_transport;tcp")
cv2.setNumThreads(1)
FPS = max(1, min(30, int(os.getenv("CCTV_PREVIEW_FPS", "30"))))
WIDTH = max(320, min(1280, int(os.getenv("CCTV_PREVIEW_WIDTH", "640"))))
QUALITY = max(40, min(90, int(os.getenv("CCTV_JPEG_QUALITY", "72"))))
TIMEOUT_MS = 5000
STALE_SECONDS = 4
IDLE_SECONDS = 30
SUBSTREAM_RETRY_SECONDS = max(60, int(os.getenv('CCTV_SUBSTREAM_RETRY_SECONDS', '300')))
_stream_managers = {}
_manager_lock = threading.Lock()
_service_lock = threading.Lock()
_service_stop = threading.Event()
_service_thread = None
_camera_infos_cache = None


class FramePacer:
    """Keep a stable FPS deadline without queuing missed frames."""
    def __init__(self, fps):
        self.period = 1 / fps
        self.deadline = None

    def due(self, now):
        if self.deadline is None:
            self.deadline = now + self.period
            return True
        if now + 1e-9 < self.deadline:
            return False
        periods = max(1, math.floor((now - self.deadline + 1e-9) / self.period) + 1)
        self.deadline += periods * self.period
        return True


def get_camera_infos(camera_ids=None, active_only=True):
    if camera_ids is not None and not camera_ids:
        return {}
    conn = get_db_general_connection()
    try:
        with conn.cursor() as cursor:
            placeholders = ','.join(['%s'] * len(camera_ids or []))
            cursor.execute(
                f"SELECT id, camera_code, camera_name, station_slug, location, rtsp_url, is_active "
                "FROM public.cctv_cameras WHERE " +
                (f"id IN ({placeholders})" if camera_ids is not None else "TRUE") +
                (" AND is_active = 1" if active_only else ""), tuple(camera_ids or []))
            return {row['id']: row for row in cursor.fetchall()}
    finally:
        conn.close()


def get_camera_info_by_id(camera_id):
    return get_camera_infos([camera_id], active_only=False).get(camera_id)


def get_live_camera_infos(camera_ids):
    # The supervisor refreshes this snapshot away from the delivery loop. A slow
    # database query must not pause the shared connection for every healthy tile.
    with _manager_lock:
        cached = _camera_infos_cache
    if cached is not None and _service_thread is not None and _service_thread.is_alive():
        return {cid: cached[cid] for cid in camera_ids if cid in cached}
    return get_camera_infos(camera_ids)


def preview_url(url):
    # Hikvision: channel *01 = main, *02 = substream. Preserve credentials/query.
    if os.getenv("CCTV_PREFER_SUBSTREAM", "true").lower() not in ('1', 'true', 'yes'):
        return url
    return re.sub(r'(/(?:ISAPI/)?Streaming/Channels/\d+)01(?=/|\?|$)',
                  r'\g<1>02', url, flags=re.IGNORECASE)


def create_status_frame_bytes(title="CAMERA", subtitle="Connecting to RTSP..."):
    img = np.full((360, 640, 3), (15, 23, 42), dtype=np.uint8)
    cv2.putText(img, title[:50], (25, 70), cv2.FONT_HERSHEY_SIMPLEX, .7, (255, 255, 255), 2)
    cv2.putText(img, subtitle[:65], (25, 180), cv2.FONT_HERSHEY_SIMPLEX, .5, (148, 163, 184), 1)
    ok, jpeg = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, QUALITY])
    return jpeg.tobytes() if ok else b''


def encode_preview(frame, width):
    if frame.shape[1] > width:
        height = max(1, round(frame.shape[0] * width / frame.shape[1]))
        frame = cv2.resize(frame, (width, height), interpolation=cv2.INTER_AREA)
    ok, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, QUALITY])
    return jpeg.tobytes() if ok else b''



class CameraStreamManager:
    def __init__(self, camera_info, preview=False, persistent=False):
        self.camera_id = camera_info['id']
        self.camera_name = camera_info['camera_name'] or f'Camera {self.camera_id}'
        self.rtsp_url = camera_info['rtsp_url']
        self.preview = preview
        self.running = True
        self.persistent = persistent
        self.stop_event = threading.Event()
        self.frame_ready = threading.Event()
        self.lock = threading.Lock()
        self.encode_lock = threading.Lock()
        self.variants = {}
        self.latest_jpeg = None
        self.latest_frame = None
        self.sequence = 0
        self.last_frame_at = 0
        self.last_used = time.monotonic()
        self.detail_sequence = -1
        self.detail_jpeg = None
        self.source_shape = None
        self.source_fps = None
        self.recent_frames = deque(maxlen=FPS * 5 + 1)
        self.viewer_widths = {}
        self.jpeg_shape = None
        self.reconnects = 0
        self.substream_recoveries = 0
        self.probe_lock = threading.Lock()
        self.probe_thread = None
        self.substream_capture = None
        self.connection_state = 'connecting'
        self.source_kind = 'substream' if preview and preview_url(self.rtsp_url) != self.rtsp_url else 'main'
        self.thread = threading.Thread(target=self._update_loop, daemon=True,
                                       name=f"cctv-{self.camera_id}")
        self.thread.start()

    def stop(self):
        self.running = False
        self.stop_event.set()
        if hasattr(self, 'probe_lock'):
            capture = self._take_substream()
            if capture is not None:
                capture.release()

    def _take_substream(self):
        with self.probe_lock:
            capture, self.substream_capture = self.substream_capture, None
            return capture

    def _probe_substream(self, source, options):
        """Validate a recovered substream without pausing the live main reader."""
        capture = None
        try:
            capture = cv2.VideoCapture(source, cv2.CAP_FFMPEG, options)
            if not capture.isOpened():
                return
            ok, frame = capture.read()
            if not ok or frame is None:
                return
            with self.probe_lock:
                if self._needed() and self.substream_capture is None:
                    self.substream_capture, capture = capture, None
        except Exception:
            pass  # The working main stream remains untouched.
        finally:
            if capture is not None:
                capture.release()

    def _needed(self):
        return self.running and (self.persistent or time.monotonic() - self.last_used < IDLE_SECONDS)

    def _update_loop(self):
        source = preview_url(self.rtsp_url) if self.preview else self.rtsp_url
        preferred_source = source
        failures = 0
        while self._needed():
            cap = None
            try:
                # FFmpeg runs inside OpenCV: no child console, CUDA dependency,
                # raw-video pipe or forced upscaling. Preserve native aspect/size.
                options = [cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, TIMEOUT_MS,
                           cv2.CAP_PROP_READ_TIMEOUT_MSEC, TIMEOUT_MS,
                           cv2.CAP_PROP_HW_ACCELERATION, cv2.VIDEO_ACCELERATION_NONE]
                if hasattr(cv2, 'CAP_PROP_N_THREADS'):
                    options += [cv2.CAP_PROP_N_THREADS, 1]
                cap = cv2.VideoCapture(source, cv2.CAP_FFMPEG, options)
                if not cap.isOpened():
                    raise RuntimeError('RTSP open timed out')
                self.source_fps = cap.get(cv2.CAP_PROP_FPS) or None
                if self.source_fps is not None and not math.isfinite(self.source_fps):
                    self.source_fps = None
                with self.lock:
                    self.recent_frames.clear()
                pacer = FramePacer(FPS)
                background_pacer = FramePacer(1)
                connected_at = time.monotonic()
                probe_at = connected_at + SUBSTREAM_RETRY_SECONDS + random.uniform(0, 60)
                while self._needed():
                    if source != preferred_source:
                        replacement = self._take_substream()
                        if replacement is not None:
                            cap.release()
                            cap = replacement
                            source = preferred_source
                            self.source_kind = 'substream'
                            self.substream_recoveries += 1
                            self.source_fps = cap.get(cv2.CAP_PROP_FPS) or None
                        elif time.monotonic() >= probe_at:
                            if self.probe_thread is None or not self.probe_thread.is_alive():
                                self.probe_thread = threading.Thread(target=self._probe_substream,
                                    args=(preferred_source, options), daemon=True,
                                    name=f'cctv-substream-probe-{self.camera_id}')
                                self.probe_thread.start()
                            probe_at = time.monotonic() + SUBSTREAM_RETRY_SECONDS + random.uniform(0, 60)
                    # Decode/drain every source frame, but convert to BGR only
                    # when needed. Unviewed cameras avoid 20-30 full-size copies/s.
                    if not cap.grab():
                        raise RuntimeError('RTSP frame read failed')
                    now = time.monotonic()
                    # Drain at source FPS; encode only at preview FPS. Sleeping
                    # after read lets old frames accumulate in the decoder.
                    if not pacer.due(now):
                        continue
                    # Keep RTSP warm without encoding 30 JPEGs/sec for cameras
                    # nobody is viewing. Viewers restore the full rate immediately.
                    if now - self.last_used >= 2 and self.persistent and not background_pacer.due(now):
                        continue
                    ok, frame = cap.retrieve()
                    if not ok or frame is None:
                        raise RuntimeError('RTSP frame conversion failed')
                    width = self.requested_preview_width(now) if self.preview else WIDTH
                    jpeg = encode_preview(frame, width)
                    if not jpeg:
                        continue
                    with self.lock:
                        self.latest_jpeg = jpeg
                        self.latest_frame = frame
                        self.sequence += 1
                        self.variants.clear()
                        self.last_frame_at = now
                        self.recent_frames.append(now)
                        self.source_shape = [frame.shape[1], frame.shape[0]]
                        self.jpeg_shape = [min(frame.shape[1], width),
                                           max(1, round(frame.shape[0] * min(frame.shape[1], width) / frame.shape[1]))]
                        self.connection_state = 'live'
                        self.frame_ready.set()
                    if now - connected_at > 10:
                        failures = 0
            except Exception as error:
                failures += 1
                self.reconnects += 1
                self.frame_ready.clear()
                with self.lock:
                    self.connection_state = 'offline' if failures >= 2 else 'reconnecting'
                logging.warning('[CCTV] Camera %s: %s; reconnecting', self.camera_id,
                                type(error).__name__)
                if source != self.rtsp_url and failures >= 2:
                    source = self.rtsp_url
                    self.source_kind = 'main-fallback'
            finally:
                if cap is not None:
                    cap.release()
            if self.running:
                self.stop_event.wait(min(30, 2 ** min(failures - 1, 5)) + random.random())
        self.running = False
        if hasattr(self, 'probe_lock'):
            capture = self._take_substream()
            if capture is not None:
                capture.release()
        self.frame_ready.clear()
        with self.lock:
            self.latest_frame = self.latest_jpeg = self.detail_jpeg = None

    def requested_preview_width(self, now):
        with self.lock:
            self.viewer_widths = {key: value for key, value in self.viewer_widths.items() if value[0] > now}
            return max((value[1] for value in self.viewer_widths.values()), default=WIDTH)

    def get_packet(self, detail=False, viewing=True, preview_width=None, viewer_key=None):
        if viewing:
            self.last_used = time.monotonic()
        with self.lock:
            if viewing and hasattr(self, 'viewer_widths'):
                width = WIDTH if preview_width is None else max(160, min(WIDTH, preview_width))
                self.viewer_widths[viewer_key] = (self.last_used + 2, width)
            age = time.monotonic() - self.last_frame_at
            live = self.latest_jpeg is not None and age < STALE_SECONDS
            status = 'live' if live else getattr(self, 'connection_state', 'reconnecting' if self.sequence else 'connecting')
            if not live and status == 'live':
                status = 'reconnecting'
            meta = {'camera_id': self.camera_id, 'sequence': self.sequence,
                    'status': status, 'age_ms': round(age * 1000) if self.last_frame_at else None}
            shape = getattr(self, 'source_shape', None)
            width = None
            if live and shape:
                if detail:
                    width = min(shape[0], 1280)
                    jpeg_shape = [width, max(1, round(shape[1] * width / shape[0]))]
                else:
                    jpeg_shape = getattr(self, 'jpeg_shape', None) or [min(shape[0], WIDTH),
                                  max(1, round(shape[1] * min(shape[0], WIDTH) / shape[0]))]
                    if preview_width is not None:
                        width = min(shape[0], WIDTH, max(160, preview_width))
                        jpeg_shape = [width, max(1, round(shape[1] * width / shape[0]))]
                meta.update(jpeg_width=jpeg_shape[0], jpeg_height=jpeg_shape[1])
            jpeg = self.latest_jpeg if live else b''
            frame = self.latest_frame if live and (detail or width is not None
                    and width != (getattr(self, 'jpeg_shape', None) or [min(shape[0], WIDTH)])[0]) else None
            sequence = self.sequence
            cached_detail = self.detail_jpeg if self.detail_sequence == sequence else None
        if frame is not None:
            width = min(frame.shape[1], 1280) if detail else width
            # Per-resolution cache: a slow viewer must receive its own smaller
            # JPEG even while another viewer requests a larger shared preview.
            # The encoder lock is separate from capture so readers keep draining.
            with self.encode_lock:
                with self.lock:
                    cached = self.variants.get(width) if self.sequence == sequence else None
                jpeg = cached or (cached_detail if detail else None) or encode_preview(frame, width)
                with self.lock:
                    if self.sequence == sequence:
                        self.variants[width] = jpeg
                        if detail:
                            self.detail_sequence, self.detail_jpeg = sequence, jpeg
        return meta, jpeg

    def get_latest_jpeg(self, detail=False):
        meta, jpeg = self.get_packet(detail=detail)
        return jpeg or create_status_frame_bytes(self.camera_name, meta['status'])

    def get_latest_frame_mat(self):
        self.last_used = time.monotonic()
        with self.lock:
            if time.monotonic() - self.last_frame_at >= STALE_SECONDS:
                return None
            return self.latest_frame.copy() if self.latest_frame is not None else None

    def measured_fps(self):
        """Recent encoded rate, distinct from the configured limit/source rate."""
        now = time.monotonic()
        with self.lock:
            samples = [stamp for stamp in self.recent_frames if now - stamp <= 5]
        if len(samples) < 2 or now - samples[-1] > 2:
            return 0.0
        elapsed = samples[-1] - samples[0]
        return round((len(samples) - 1) / elapsed, 1) if elapsed > 0 else 0.0


def get_stream_manager(camera_id, preview=False, camera_info=None, persistent=False):
    info = camera_info or get_camera_info_by_id(camera_id)
    if not info or info.get('is_active', 1) != 1 or not info.get('rtsp_url'):
        raise ValueError(f'Active camera {camera_id} not found')
    key = (info['rtsp_url'], preview)
    with _manager_lock:
        for old_key, old in list(_stream_managers.items()):
            if not old.running:
                del _stream_managers[old_key]
        manager = _stream_managers.get(key)
        if manager is None:
            manager = CameraStreamManager(info, preview, persistent=persistent)
            _stream_managers[key] = manager
        if persistent:
            manager.persistent = True
        else:
            manager.last_used = time.monotonic()
        return manager


def reconcile_cameras(infos):
    """Warm new active URLs and retire only removed/edited/disabled sources."""
    desired = {info['rtsp_url'] for info in infos.values() if info.get('rtsp_url')}
    with _manager_lock:
        for (url, preview), manager in list(_stream_managers.items()):
            if url not in desired:
                manager.stop()
                del _stream_managers[(url, preview)]
    for cid, info in infos.items():
        if info.get('rtsp_url'):
            get_stream_manager(cid, preview=True, camera_info=info, persistent=True)


def _service_loop():
    global _camera_infos_cache
    while not _service_stop.is_set():
        try:
            infos = get_camera_infos()
            reconcile_cameras(infos)
            with _manager_lock:
                _camera_infos_cache = infos
        except Exception as error:
            logging.warning('[CCTV] Background configuration unavailable (%s); retrying', type(error).__name__)
        _service_stop.wait(5)


def start_cctv_service():
    global _service_thread
    with _service_lock:
        if _service_thread is not None and _service_thread.is_alive():
            return
        _service_stop.clear()
        _service_thread = threading.Thread(target=_service_loop, daemon=True, name='cctv-supervisor')
        _service_thread.start()


def stop_cctv_service():
    _service_stop.set()
    with _manager_lock:
        for manager in _stream_managers.values():
            manager.stop()


atexit.register(stop_cctv_service)


def frame_packet(meta, jpeg=b''):
    header = json.dumps({**meta, 'length': len(jpeg), 'sent_ms': round(time.monotonic() * 1000)},
                        separators=(',', ':')).encode('utf-8')
    return struct.pack('!I', len(header)) + header + jpeg


def generate_combined_stream(camera_ids, camera_infos, focus_id=None, viewed_ids=None, batch=False, preview_width=None, preview_fps=None, delivery=None):
    managers = {cid: get_stream_manager(cid, preview=True, camera_info=camera_infos[cid])
                for cid in camera_ids if cid in camera_infos}
    last_sent = {}
    refresh_at = time.monotonic() + 5
    viewer_key = object()
    config_snapshot = None
    delivery_fps = min(FPS, preview_fps or FPS)
    delivery_pacer = FramePacer(delivery_fps)
    revision = 0
    camera_cursor = 0
    while True:
        started = time.monotonic()
        if delivery:
            if delivery.expired():
                return
            options, next_revision = delivery.snapshot()
            if next_revision != revision:
                camera_ids = options['camera_ids']
                focus_id, viewed_ids = options['focus_id'], options['viewed_ids']
                preview_width = options['preview_width']
                delivery_fps = min(FPS, options['preview_fps'] or FPS)
                delivery_pacer = FramePacer(delivery_fps)
                revision = next_revision
                refresh_at = 0
                last_sent.clear()
                managers = {cid: manager for cid, manager in managers.items() if cid in camera_ids}
            # Stop producing bytes until the browser has consumed prior batches.
            # Readers retain only the latest frame while this viewer is slow.
            if not delivery.available():
                time.sleep(.01)
                continue
        packets = []
        packet_bytes = 0
        images_due = delivery_pacer.due(started)
        if (delivery or delivery_fps < FPS) and not images_due:
            time.sleep(.002)
            continue
        if started >= refresh_at or _camera_infos_cache is not config_snapshot:
            # Preserve target functionality: saved URL/activation edits reach existing viewers.
            # A transient DB outage keeps the last configuration until the next retry.
            try:
                updated = get_live_camera_infos(camera_ids)
                for cid in camera_ids:
                    info = updated.get(cid)
                    manager = managers.get(cid)
                    if info is None:
                        managers.pop(cid, None)
                    elif manager is None or manager.rtsp_url != info['rtsp_url']:
                        managers[cid] = get_stream_manager(cid, preview=True, camera_info=info)
                        last_sent.pop(cid, None)
                camera_infos = updated
            except Exception:
                logging.warning('[CCTV] Configuration refresh unavailable; retrying')
            config_snapshot = _camera_infos_cache
            refresh_at = started + 5
        ordered_ids = camera_ids[camera_cursor:] + camera_ids[:camera_cursor] if delivery else camera_ids
        for cid in ordered_ids:
            manager = managers.get(cid)
            # An idle reader can finish closing just as a new viewer arrives.
            # Replace it in-place so that one camera cannot stay disconnected.
            if manager is not None and not manager.running:
                manager = get_stream_manager(cid, preview=True, camera_info=camera_infos[cid])
                managers[cid] = manager
            if manager is None:
                meta, jpeg = {'camera_id': cid, 'status': 'offline', 'sequence': 0}, b''
            else:
                if viewed_ids is None or cid in viewed_ids:
                    if preview_width is None:
                        meta, jpeg = manager.get_packet(detail=cid == focus_id)
                    else:
                        meta, jpeg = manager.get_packet(detail=cid == focus_id, preview_width=preview_width, viewer_key=viewer_key)
                else:
                    meta, _ = manager.get_packet(viewing=False)
                    jpeg = b''
                meta['camera_id'] = cid  # aliases can share a reader
            previous = last_sent.get(cid)
            state = (meta['sequence'] if viewed_ids is None or cid in viewed_ids else 0, meta['status'])
            if previous and previous[0] == state and started - previous[1] < 1:
                continue
            # Heartbeats carry status only, never recycled stale video frames.
            if previous and previous[0] == state:
                jpeg = b''
            last_sent[cid] = (state, started)
            packet = frame_packet(meta, jpeg)
            if not batch:
                yield packet
            else:
                # Bound each write, and flush this sweep immediately. Hundreds
                # of small WSGI/HTTP writes per second add overhead and amplify
                # backpressure across the proxy when many cameras are visible.
                if packets and packet_bytes + len(packet) > 2 * 1024 * 1024:
                    if delivery:
                        batch_id = delivery.reserve(packet_bytes)
                        packets.append(frame_packet({'type': 'batch', 'batch_id': batch_id}))
                    yield b''.join(packets)
                    packets, packet_bytes = [], 0
                packets.append(packet)
                packet_bytes += len(packet)
                if delivery and packet_bytes >= 256 * 1024:
                    # Round-robin partial sweeps bound in-flight bytes even with
                    # hundreds of large frames; later cameras cannot starve.
                    camera_cursor = (camera_ids.index(cid) + 1) % len(camera_ids)
                    break
        if packets:
            if delivery:
                batch_id = delivery.reserve(packet_bytes)
                packets.append(frame_packet({'type': 'batch', 'batch_id': batch_id}))
            yield b''.join(packets)
        # Poll faster than producers so unrelated camera phases do not halve FPS.
        # No extra JPEGs are sent unless a camera's frame sequence has changed.
        time.sleep(max(.002, 1 / (FPS * 2) - (time.monotonic() - started)))


def stream_diagnostics():
    with _manager_lock:
        managers = list(_stream_managers.values())
    return [{'camera_id': m.camera_id, 'preview': m.preview, 'running': m.running,
             'sequence': m.sequence, 'source': m.source_kind, 'resolution': m.source_shape,
             'source_fps': m.source_fps, 'target_fps': FPS,
             'preview_resolution': m.jpeg_shape,
             'encoded_fps': m.measured_fps(),
             'encoding_mode': 'idle' if m.persistent and time.monotonic() - m.last_used >= 2 else 'viewing',
             'persistent': m.persistent, 'decoder': 'cpu', 'reconnects': m.reconnects,
             'substream_recoveries': m.substream_recoveries,
             'status': m.get_packet(viewing=False)[0]['status'],
             'age_ms': round((time.monotonic() - m.last_frame_at) * 1000) if m.last_frame_at else None}
            for m in managers]


def get_camera_status(camera_id):
    """Keep the target's status endpoint; inspecting status never opens RTSP."""
    info = get_camera_info_by_id(camera_id)
    if not info:
        return {'camera_id': camera_id, 'status': 'config_error', 'message': 'Camera not found'}
    if info['is_active'] != 1:
        return {'camera_id': camera_id, 'status': 'disabled', 'message': 'Camera disabled'}
    with _manager_lock:
        manager = _stream_managers.get((info['rtsp_url'], True))
    if manager is None:
        return {'camera_id': camera_id, 'status': 'connecting', 'message': 'No active capture'}
    meta, _ = manager.get_packet(viewing=False)
    status = meta['status']
    return {'camera_id': camera_id, 'status': status, 'age_ms': meta['age_ms'],
            'message': '' if status == 'live' else 'Waiting for camera'}


def generate_mjpeg_stream_by_id(camera_id=1):
    manager = get_stream_manager(camera_id, preview=True)
    while True:
        yield b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + manager.get_latest_jpeg() + b'\r\n'
        time.sleep(1 / FPS)


def capture_single_snapshot(camera_id=1):
    manager = get_stream_manager(camera_id)
    # A newly opened main reader needs its first keyframe before a real snapshot.
    manager.frame_ready.wait(TIMEOUT_MS / 1000)
    frame = manager.get_latest_frame_mat()
    if frame is None:
        return manager.get_latest_jpeg()
    ok, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 92])
    return jpeg.tobytes() if ok else manager.get_latest_jpeg()
