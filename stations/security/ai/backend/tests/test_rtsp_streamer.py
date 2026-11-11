import struct
import threading
import time
import unittest
from unittest.mock import patch
from core import rtsp_streamer as streams


class StreamRegressionTests(unittest.TestCase):
    def test_live_config_snapshot_avoids_database_in_delivery_loop_and_preserves_aliases(self):
        cached = {1: {'id': 1, 'rtsp_url': 'rtsp://one'}, 2: {'id': 2, 'rtsp_url': 'rtsp://one'}}
        supervisor = unittest.mock.Mock()
        supervisor.is_alive.return_value = True
        with patch.object(streams, '_camera_infos_cache', cached), \
                patch.object(streams, '_service_thread', supervisor), \
                patch.object(streams, 'get_camera_infos', side_effect=RuntimeError('database unavailable')) as database:
            self.assertEqual(streams.get_live_camera_infos([1, 2, 3]), cached)
            database.assert_not_called()
            cached.pop(1)
            self.assertEqual(streams.get_live_camera_infos([1, 2]), {2: cached[2]})

    def test_measured_fps_reports_unique_encodes_including_idle_and_stalled(self):
        from collections import deque
        manager = streams.CameraStreamManager.__new__(streams.CameraStreamManager)
        manager.lock = threading.Lock()
        with patch.object(streams.time, 'monotonic', return_value=10):
            manager.recent_frames = deque(9 + i / 20 for i in range(21))
            self.assertEqual(manager.measured_fps(), 20)
            manager.recent_frames = deque([7, 8, 9, 10])
            self.assertEqual(manager.measured_fps(), 1)
            manager.recent_frames = deque([1, 2])
            self.assertEqual(manager.measured_fps(), 0)

    def test_preview_metadata_preserves_aspect_and_fullscreen_resolution(self):
        import numpy as np
        manager = streams.CameraStreamManager.__new__(streams.CameraStreamManager)
        manager.camera_id = 1
        manager.lock = threading.Lock()
        manager.last_frame_at = time.monotonic()
        manager.latest_jpeg = b'preview'
        manager.latest_frame = np.zeros((720, 1280, 3), dtype=np.uint8)
        manager.encode_lock = threading.Lock()
        manager.variants = {}
        manager.source_shape = [1280, 720]
        manager.sequence = 1
        manager.detail_sequence = -1
        manager.detail_jpeg = None
        meta, _ = manager.get_packet()
        width = min(1280, streams.WIDTH)
        self.assertEqual((meta['jpeg_width'], meta['jpeg_height']), (width, round(720 * width / 1280)))
        meta, jpeg = manager.get_packet(detail=True)
        self.assertEqual((meta['jpeg_width'], meta['jpeg_height']), (1280, 720))
        decoded = streams.cv2.imdecode(np.frombuffer(jpeg, dtype=np.uint8), streams.cv2.IMREAD_COLOR)
        self.assertEqual(decoded.shape[:2], (720, 1280))

    def test_preview_width_uses_largest_active_viewer_and_expires_closed_viewers(self):
        manager = streams.CameraStreamManager.__new__(streams.CameraStreamManager)
        manager.lock = threading.Lock()
        manager.viewer_widths = {'small': (10, 320), 'large': (8, streams.WIDTH)}
        self.assertEqual(manager.requested_preview_width(7), max(320, streams.WIDTH))
        self.assertEqual(manager.requested_preview_width(9), 320)
        self.assertNotIn('large', manager.viewer_widths)
        self.assertEqual(manager.requested_preview_width(11), streams.WIDTH)

    def test_bandwidth_preview_accepts_160_without_affecting_fullscreen_dimensions(self):
        import numpy as np
        manager = streams.CameraStreamManager.__new__(streams.CameraStreamManager)
        manager.camera_id = 1
        manager.lock = threading.Lock()
        manager.viewer_widths = {}
        manager.last_frame_at = time.monotonic()
        manager.latest_jpeg = b'preview'
        manager.latest_frame = np.zeros((720, 1280, 3), dtype=np.uint8)
        manager.encode_lock = threading.Lock()
        manager.variants = {}
        manager.source_shape = [1280, 720]
        manager.jpeg_shape = [160, 90]
        manager.sequence = 1
        manager.detail_sequence = -1
        manager.detail_jpeg = None
        meta, _ = manager.get_packet(preview_width=160, viewer_key='slow-viewer')
        self.assertEqual(manager.requested_preview_width(time.monotonic()), 160)
        self.assertEqual((meta['jpeg_width'], meta['jpeg_height']), (160, 90))
        meta, _ = manager.get_packet(detail=True, preview_width=160, viewer_key='slow-viewer')
        self.assertEqual((meta['jpeg_width'], meta['jpeg_height']), (1280, 720))

    def test_viewer_delivery_fps_samples_latest_sequence_without_changing_global_limit(self):
        import json
        clock = [0]
        class Reader:
            running = True
            def get_packet(self, **kw):
                return {'camera_id': 1, 'sequence': round(clock[0] * 30), 'status': 'live'}, b'jpeg'
        reader = Reader()
        def tick(_): clock[0] += 1 / 60
        with patch.object(streams, 'get_stream_manager', return_value=reader), \
                patch.object(streams.time, 'monotonic', side_effect=lambda: clock[0]), \
                patch.object(streams.time, 'sleep', side_effect=tick):
            generator = streams.generate_combined_stream([1], {1: {'id': 1}}, preview_fps=15)
            sequences = []
            for _ in range(76):
                data = next(generator)
                size = struct.unpack('!I', data[:4])[0]
                sequences.append(json.loads(data[4:4 + size])['sequence'])
            generator.close()
        self.assertEqual(len(set(sequences)), 76)
        self.assertAlmostEqual(clock[0], 5, places=5)
        self.assertEqual(sequences[-1], 150)

    def test_batched_delivery_preserves_all_47_packet_boundaries(self):
        import json
        class Reader:
            running = True
            def __init__(self, cid): self.cid = cid
            def get_packet(self, **kw):
                self.preview_width = kw['preview_width']
                return {'camera_id': self.cid, 'sequence': 1, 'status': 'live'}, b'jpeg'
        ids = list(range(1, 48))
        readers = {cid: Reader(cid) for cid in ids}
        with patch.object(streams, 'get_stream_manager', side_effect=lambda cid, **kw: readers[cid]):
            generator = streams.generate_combined_stream(ids, {cid: {'id': cid} for cid in ids}, batch=True, preview_width=320)
            data = next(generator)
            generator.close()
        received = []
        while data:
            size = struct.unpack('!I', data[:4])[0]
            meta = json.loads(data[4:4 + size])
            self.assertEqual(data[4 + size:4 + size + meta['length']], b'jpeg')
            received.append(meta['camera_id'])
            data = data[4 + size + meta['length']:]
        self.assertEqual(received, ids)
        self.assertTrue(all(reader.preview_width == 320 for reader in readers.values()))

    def test_status_inspection_does_not_start_disabled_or_idle_camera(self):
        row = {'id': 1, 'is_active': 0, 'rtsp_url': 'rtsp://example/test'}
        with patch.object(streams, 'get_camera_info_by_id', return_value=row), \
                patch.object(streams, 'CameraStreamManager') as capture:
            self.assertEqual(streams.get_camera_status(1)['status'], 'disabled')
            row['is_active'] = 1
            self.assertEqual(streams.get_camera_status(1)['status'], 'connecting')
            capture.assert_not_called()

    def test_combined_stream_applies_saved_url_and_disabled_changes(self):
        import json
        clock = [0]
        infos = {cid: {'id': cid, 'rtsp_url': f'rtsp://example/old{cid}'} for cid in (1, 2)}
        updated = {2: {'id': 2, 'rtsp_url': 'rtsp://example/new2'}}
        class Reader:
            running = True
            def __init__(self, cid, info): self.cid, self.rtsp_url = cid, info['rtsp_url']
            def get_packet(self, detail=False):
                return {'camera_id': self.cid, 'sequence': 1, 'status': 'live'}, self.rtsp_url.encode()
        def decoded(data):
            size = struct.unpack('!I', data[:4])[0]
            return json.loads(data[4:4 + size]), data[4 + size:]
        with patch.object(streams, 'get_stream_manager', side_effect=lambda cid, **kw: Reader(cid, kw['camera_info'])), \
                patch.object(streams, 'get_camera_infos', return_value=updated), \
                patch.object(streams.time, 'monotonic', side_effect=lambda: clock[0]), \
                patch.object(streams.time, 'sleep'):
            generator = streams.generate_combined_stream([1, 2], infos)
            next(generator); next(generator)
            clock[0] = 6
            self.assertEqual(decoded(next(generator))[0]['status'], 'offline')
            self.assertEqual(decoded(next(generator))[1], b'rtsp://example/new2')
            generator.close()

    def test_existing_stream_endpoint_validates_disabled_camera(self):
        from flask import Flask
        from routes.stream_routes import stream_bp
        app = Flask(__name__)
        app.register_blueprint(stream_bp)
        client = app.test_client()
        self.assertEqual(client.get('/api/security-ai/stream?camera_id=bad').status_code, 400)
        self.assertEqual(client.get('/api/security-ai/live?ids=1,-2').status_code, 400)
        self.assertEqual(client.get('/api/security-ai/live?ids=1&width=bad').status_code, 400)
        self.assertEqual(client.get('/api/security-ai/live?ids=1&width=2000').status_code, 400)
        self.assertEqual(client.get('/api/security-ai/live?ids=1&width=159').status_code, 400)
        self.assertEqual(client.get('/api/security-ai/live?ids=1&fps=0').status_code, 400)
        self.assertEqual(client.get('/api/security-ai/live?ids=1&fps=31').status_code, 400)
        with patch('routes.stream_routes.get_camera_info_by_id', return_value={'is_active': 0}):
            self.assertEqual(client.get('/api/security-ai/stream?camera_id=1').status_code, 409)

    def test_pacer_preserves_target_rate_for_19_and_20_fps_sources(self):
        for source_fps in (19, 20, 25, 30):
            pacer = streams.FramePacer(15)
            frames = sum(pacer.due(i / source_fps) for i in range(source_fps * 40))
            self.assertLessEqual(abs(frames - 600), 1, source_fps)

    def test_pacer_skips_missed_deadlines_after_a_stall(self):
        pacer = streams.FramePacer(15)
        self.assertTrue(pacer.due(0))
        self.assertTrue(pacer.due(10))
        self.assertFalse(pacer.due(10))
        self.assertFalse(pacer.due(10.01))
        self.assertLessEqual(pacer.deadline - 10, 1 / 15 + 1e-9)

    def test_snapshot_keeps_main_stream_resolution(self):
        import numpy as np
        frame = np.zeros((1440, 2560, 3), dtype=np.uint8)
        class Reader:
            frame_ready = threading.Event()
            frame_ready.set()
            def get_latest_frame_mat(self): return frame
        with patch.object(streams, 'get_stream_manager', return_value=Reader()):
            jpeg = streams.capture_single_snapshot(1)
        decoded = streams.cv2.imdecode(np.frombuffer(jpeg, dtype=np.uint8), streams.cv2.IMREAD_COLOR)
        self.assertEqual(decoded.shape, frame.shape)

    def test_substream_preserves_channel_and_credentials(self):
        for channel in (1, 6, 10, 16):
            main = f'rtsp://user:pass@192.0.2.1/Streaming/Channels/{channel}01?foo=bar'
            self.assertEqual(streams.preview_url(main), main.replace(f'{channel}01?', f'{channel}02?'))
        self.assertEqual(streams.preview_url('rtsp://example/other'), 'rtsp://example/other')

    def test_stale_frame_is_not_reported_live_or_recycled(self):
        manager = streams.CameraStreamManager.__new__(streams.CameraStreamManager)
        manager.camera_id = 1
        manager.lock = threading.Lock()
        manager.last_frame_at = time.monotonic() - 10
        manager.latest_jpeg = b'old-frame'
        manager.latest_frame = None
        manager.sequence = 9
        manager.detail_sequence = -1
        manager.detail_jpeg = None
        meta, jpeg = manager.get_packet()
        self.assertEqual(meta['status'], 'reconnecting')
        self.assertEqual(jpeg, b'')
        self.assertIsNone(manager.get_latest_frame_mat())

    def test_one_broken_camera_does_not_block_remaining_15(self):
        class Reader:
            running = True
            def __init__(self, cid): self.cid = cid
            def get_packet(self, detail=False):
                return {'camera_id': self.cid, 'sequence': 1, 'status': 'live'}, b'jpeg'
        ids = list(range(1, 17))
        infos = {cid: {'id': cid} for cid in ids if cid != 7}
        with patch.object(streams, 'get_stream_manager', side_effect=lambda cid, **kwargs: Reader(cid)):
            generator = streams.generate_combined_stream(ids, infos)
            import json
            received = []
            for _ in ids:
                data = next(generator)
                size = struct.unpack('!I', data[:4])[0]
                received.append(json.loads(data[4:4 + size]))
            generator.close()
        self.assertEqual([m['camera_id'] for m in received], ids)
        self.assertEqual(received[6]['status'], 'offline')
        self.assertEqual(sum(m['status'] == 'live' for m in received), 15)

    def test_reader_that_finishes_idle_shutdown_is_replaced(self):
        class Reader:
            def __init__(self, running): self.running = running
            def get_packet(self, detail=False):
                return {'camera_id': 1, 'sequence': 1, 'status': 'live'}, b'new'
        dead, replacement = Reader(False), Reader(True)
        with patch.object(streams, 'get_stream_manager', side_effect=[dead, replacement]) as lookup:
            generator = streams.generate_combined_stream([1], {1: {'id': 1}})
            self.assertTrue(next(generator).endswith(b'new'))
            self.assertEqual(lookup.call_count, 2)
            generator.close()

    def test_capture_released_after_failure_and_idle_reader_stops(self):
        class BrokenCapture:
            released = False
            def isOpened(self): return False
            def release(self): self.released = True
        capture = BrokenCapture()
        manager = streams.CameraStreamManager.__new__(streams.CameraStreamManager)
        manager.camera_id = 1
        manager.rtsp_url = 'rtsp://example/Streaming/Channels/101'
        manager.preview = True
        manager.running = True
        manager.persistent = False
        manager.stop_event = unittest.mock.Mock()
        manager.frame_ready = threading.Event()
        manager.reconnects = 0
        manager.last_used = time.monotonic()
        manager.lock = threading.Lock()
        manager.latest_frame = manager.latest_jpeg = manager.detail_jpeg = b'old'
        def expire(_): manager.last_used = time.monotonic() - 60
        manager.stop_event.wait.side_effect = expire
        with patch.object(streams.cv2, 'VideoCapture', return_value=capture) as open_capture:
            manager._update_loop()
        options = open_capture.call_args.args[2]
        self.assertEqual(options[options.index(streams.cv2.CAP_PROP_HW_ACCELERATION) + 1], streams.cv2.VIDEO_ACCELERATION_NONE)
        self.assertTrue(capture.released)
        self.assertFalse(manager.running)
        self.assertIsNone(manager.latest_jpeg)

    def test_cold_snapshot_waits_for_first_main_frame(self):
        import numpy as np
        frame = np.zeros((360, 640, 3), dtype=np.uint8)
        class Reader:
            frame_ready = threading.Event()
            def get_latest_frame_mat(self):
                return frame if self.frame_ready.is_set() else None
            def get_latest_jpeg(self): return b'connecting-placeholder'
        reader = Reader()
        ready = threading.Timer(.05, reader.frame_ready.set)
        ready.start()
        with patch.object(streams, 'get_stream_manager', return_value=reader):
            jpeg = streams.capture_single_snapshot(1)
        ready.join()
        self.assertTrue(jpeg.startswith(b'\xff\xd8'))

    def test_30_fps_limit_never_duplicates_slower_source_frames(self):
        for source_fps in (15, 20, 25, 30, 60):
            pacer = streams.FramePacer(30)
            count = sum(pacer.due(i / source_fps) for i in range(source_fps * 10))
            self.assertLessEqual(abs(count - min(30, source_fps) * 10), 1)

    def test_persistent_camera_survives_no_viewers_and_can_stop(self):
        manager = streams.CameraStreamManager.__new__(streams.CameraStreamManager)
        manager.running = manager.persistent = True
        manager.stop_event = threading.Event()
        manager.last_used = time.monotonic() - 3600
        self.assertTrue(manager._needed())
        manager.stop()
        self.assertFalse(manager._needed())
        self.assertTrue(manager.stop_event.is_set())

    def test_reconcile_add_edit_disable_and_aliases_without_restarting_healthy_source(self):
        class Reader:
            running = True
            def __init__(self, info, preview, persistent=False):
                self.rtsp_url, self.persistent = info['rtsp_url'], persistent
                self.stopped = False
            def stop(self): self.stopped = True; self.running = False
        def infos(*pairs):
            return {cid: {'id': cid, 'is_active': 1, 'rtsp_url': url} for cid, url in pairs}
        with patch.object(streams, '_stream_managers', {}), patch.object(streams, 'CameraStreamManager', Reader):
            streams.reconcile_cameras(infos((1, 'rtsp://one'), (2, 'rtsp://two'), (3, 'rtsp://one')))
            self.assertEqual(len(streams._stream_managers), 2)
            first = streams._stream_managers[('rtsp://one', True)]
            removed = streams._stream_managers[('rtsp://two', True)]
            streams.reconcile_cameras(infos((1, 'rtsp://one'), (2, 'rtsp://new'), (4, 'rtsp://added')))
            self.assertIs(streams._stream_managers[('rtsp://one', True)], first)
            self.assertTrue(removed.stopped)
            self.assertTrue(all(m.persistent for m in streams._stream_managers.values()))
            streams.reconcile_cameras({})
            self.assertFalse(streams._stream_managers)
            self.assertTrue(first.stopped)

    def test_offscreen_camera_sends_status_without_video_or_viewer_lease(self):
        class Reader:
            running = True
            def get_packet(self, **kw):
                self.viewing = kw.get('viewing', True)
                return {'camera_id': 1, 'sequence': 1, 'status': 'live'}, b'jpeg'
        reader = Reader()
        with patch.object(streams, 'get_stream_manager', return_value=reader):
            generator = streams.generate_combined_stream([1], {1: {'id': 1}}, viewed_ids=set())
            data = next(generator)
            size = struct.unpack('!I', data[:4])[0]
            self.assertEqual(data[4 + size:], b'')
            self.assertFalse(reader.viewing)
            generator.close()


if __name__ == '__main__':
    unittest.main()
