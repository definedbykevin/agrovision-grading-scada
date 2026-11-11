# ═══════════════════════════════════════════════════════════════════════
# CORE MODULE: STERILIZER FFB RTSP STREAMER WITH DYNAMIC ROI OVERLAYS
# ═══════════════════════════════════════════════════════════════════════

import os
import time
import json
import threading
import logging
# pyrefly: ignore[missing-import]
import cv2
# pyrefly: ignore[missing-import]
import numpy as np
from config.settings import Config
from config.database import get_db_ai_connection

logging.basicConfig(level=logging.INFO)

# Optimasi FFmpeg low-latency & socket timeout flag
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp|fflags;nobuffer|flags;low_delay|stimeout;5000000"

# Konstanta Spatial Crop Area Aktif Conveyor (Pangkas atap/chute atas Y: 0 -> 500)
# Menyisakan buffer 280 px di atas Red Line (Y=780) setara 1 tandan sawit utuh (~220 px) + 60 px clearance
CROP_Y_TOP = 500
ACTIVE_CONVEYOR_HEIGHT = 780
ACTIVE_CONVEYOR_WIDTH = 720

def get_active_camera_by_line(line_no=1):
    """
    Mengambil data kamera aktif langsung dari PostgreSQL (agrovision_sterilizer_ai_ffb.ai_cameras).
    Mendukung pencarian spesifik per line_no atau fallback ke kamera aktif default jika hanya ada 1 kamera.
    """
    try:
        conn = get_db_ai_connection()
        if not conn:
            return None
        with conn.cursor() as cursor:
            # 1. Coba cari kamera spesifik per line jika tersedia
            cursor.execute(
                """
                SELECT id, camera_code, rtsp_url, location, is_active, roi_redline, roi_greenline
                FROM ai_cameras
                WHERE is_active = TRUE AND (location ILIKE %s OR camera_code ILIKE %s)
                ORDER BY id ASC
                LIMIT 1
                """,
                (f"%Line {line_no}%", f"%L{line_no}%")
            )
            row = cursor.fetchone()

            # 2. Jika tidak ditemukan kamera khusus line tersebut, fallback ke kamera aktif pertama
            if not row:
                cursor.execute(
                    """
                    SELECT id, camera_code, rtsp_url, location, is_active, roi_redline, roi_greenline
                    FROM ai_cameras
                    WHERE is_active = TRUE
                    ORDER BY id ASC
                    LIMIT 1
                    """
                )
                row = cursor.fetchone()
        conn.close()
        return row
    except Exception as e:
        logging.error(f"[CameraStreamer] Error reading ai_cameras table: {e}")
        return None

def draw_roi_overlays(frame, roi_redline, roi_greenline):
    """
    Menggambar visual Red Line (trigger deteksi) dan Green ROI (tracking area) di atas frame.
    Murni menggambar border garis tipis tanpa manipulasi brightness, kontras, atau color-wash apapun.
    """
    if frame is None:
        return frame

    h, w = frame.shape[:2]

    # 1. Gambar Green Tracking ROI (Hanya border garis tipis, tanpa addWeighted/fill)
    if roi_greenline and isinstance(roi_greenline, dict):
        x1 = int(roi_greenline.get("x1", 0))
        y1 = int(roi_greenline.get("y1", 500))
        x2 = int(roi_greenline.get("x2", w))
        y2 = int(roi_greenline.get("y2", h))
        
        # Clamp koordinat ke ukuran frame
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)

        # Border garis hijau tipis murni
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 120), 1)
        cv2.putText(
            frame, "TRACKING ZONE (GREEN ROI)", 
            (x1 + 10, y1 + 22), 
            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 120), 1, cv2.LINE_AA
        )

    # 2. Gambar Red Trigger Line
    if roi_redline and isinstance(roi_redline, dict):
        rx1 = int(roi_redline.get("x1", 0))
        ry1 = int(roi_redline.get("y1", 500))
        rx2 = int(roi_redline.get("x2", w))
        ry2 = int(roi_redline.get("y2", 500))

        # Clamp koordinat
        rx1, ry1 = max(0, rx1), max(0, ry1)
        rx2, ry2 = min(w, rx2), min(h, ry2)

        # Garis merah tipis pemicu
        cv2.line(frame, (rx1, ry1), (rx2, ry2), (0, 0, 255), 2, cv2.LINE_AA)
        cv2.putText(
            frame, "DETECTION TRIGGER LINE (RED)", 
            (rx1 + 10, max(25, ry1 - 8)), 
            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1, cv2.LINE_AA
        )

    return frame

def draw_inference_polygons(frame, detections):
    """
    Menggambar visual polygon segmentasi inferensi YOLO & label pada frame streaming
    secara non-blocking saat siklus inlet door OPEN aktif.
    Warna BGR:
      - ripe: (50, 205, 50) (Hijau)
      - underripe: (0, 215, 255) (Kuning/Emas)
      - overripe: (180, 80, 180) (Ungu)
    """
    if frame is None or not detections:
        return frame

    COLOR_MAP = {
        "ripe": (50, 205, 50),
        "underripe": (0, 215, 255),
        "overripe": (180, 80, 180),
    }

    for det in detections:
        cls_name = (det.get("class") or "ripe").lower()
        color = COLOR_MAP.get(cls_name, (0, 255, 120))
        track_id = det.get("track_id", 0)
        conf = float(det.get("conf") or 0.0)
        bbox = det.get("bbox")
        poly = det.get("poly")

        # 1. Gambar polygon contour segmentasi YOLO jika tersedia
        if poly is not None and hasattr(poly, "__len__") and len(poly) > 2:
            try:
                cv2.polylines(frame, [poly], isClosed=True, color=color, thickness=2, lineType=cv2.LINE_AA)
            except Exception:
                pass
        elif bbox is not None:
            # Fallback jika polygon kosong, gunakan bounding box
            x1, y1, x2, y2 = bbox
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2, cv2.LINE_AA)

        # 2. Gambar tag label ringkas (ID, Kategori, Confidence)
        if bbox is not None:
            x1, y1, x2, y2 = bbox
            conf_pct = int(conf * 100 if conf <= 1.0 else conf)
            label = f"TRK-{track_id} {cls_name.upper()} {conf_pct}%"
            (lw, lh), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
            tag_y1 = max(0, y1 - lh - 6)
            cv2.rectangle(frame, (x1, tag_y1), (x1 + lw + 6, tag_y1 + lh + 4), color, -1)
            cv2.putText(frame, label, (x1 + 3, tag_y1 + lh + 1), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1, cv2.LINE_AA)

    return frame

def create_fallback_frame(camera_code="XNO102", subtitle="Connecting to RTSP..."):
    """
    Synthetic frame kualitas tinggi jika kamera sedang connecting/offline agar browser tidak blank
    """
    height, width = ACTIVE_CONVEYOR_HEIGHT, ACTIVE_CONVEYOR_WIDTH
    img = np.zeros((height, width, 3), np.uint8)
    img[:] = (15, 23, 42) # Dark Slate (#0f172a)

    # Frame border & grid effect
    cv2.rectangle(img, (16, 16), (width - 16, height - 16), (51, 65, 85), 2)
    cv2.circle(img, (40, 48), 10, (0, 255, 120), -1)

    timestamp_str = time.strftime("%Y-%m-%d %H:%M:%S UTC")
    cv2.putText(img, f"LIVE FFB CAMERA: {camera_code}", (62, 54), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 255, 255), 2)
    cv2.putText(img, f"STATUS: {subtitle}", (40, height // 2), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (234, 179, 8), 2)
    cv2.putText(img, timestamp_str, (40, height - 40), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (148, 163, 184), 1)

    ret, jpeg = cv2.imencode('.jpg', img, [int(cv2.IMWRITE_JPEG_QUALITY), 88])
    return jpeg.tobytes() if ret else b''

class FfbCameraStreamManager:
    """
    Manager Stream Multi-threaded Zero-Latency per Line:
    - Reader thread: membaca frame secepat aliran kamera (60 FPS) tanpa buffer lag
    - Process thread: memproses ROI & encode JPEG pada 30 FPS untuk efisiensi web/AI
    - Sinkronisasi dinamis: auto-reconnect jika rtsp_url di DB berubah
    """
    def __init__(self, line_no=1):
        self.line_no = line_no
        self.running = True
        self.lock = threading.Lock()
        self.latest_jpeg = None
        self.latest_frame = None
        self.raw_frame = None
        self.last_frame_time = 0.0
        self.camera_code = "XNO102"
        self.rtsp_url = Config.DEFAULT_RTSP_URL
        self.active_rtsp_url = ""
        self.roi_redline = {"x1": 0, "y1": 780, "x2": 720, "y2": 780}
        self.roi_greenline = {"x1": 0, "y1": 780, "x2": 720, "y2": 1280}
        self.is_connected = False
        self.active_detections = []
        self.overlay_lock = threading.Lock()
        
        # 1. Thread pembaca frame RTSP (Zero-latency grabber)
        self.reader_thread = threading.Thread(target=self._reader_loop, daemon=True)
        self.reader_thread.start()

        # 2. Thread pemroses frame (Overlay + JPEG encoder)
        self.process_thread = threading.Thread(target=self._process_loop, daemon=True)
        self.process_thread.start()

        # 3. Thread inferensi AI mandiri (Decoupled, tidak memblokir kelancaran streaming video)
        self.ai_thread = threading.Thread(target=self._ai_inference_loop, daemon=True)
        self.ai_thread.start()

    def _sync_config_from_db(self):
        cam = get_active_camera_by_line(self.line_no)
        if cam:
            self.camera_code = cam.get("camera_code") or self.camera_code
            new_url = cam.get("rtsp_url")
            if new_url and new_url != self.rtsp_url:
                logging.info(f"[FfbStreamer] RTSP URL changed in DB: '{self.rtsp_url[:35]}' -> '{new_url[:35]}'")
                self.rtsp_url = new_url
            
            # Parse ROI jika string/dict
            r_red = cam.get("roi_redline")
            if isinstance(r_red, str):
                try: r_red = json.loads(r_red)
                except: pass
            if isinstance(r_red, dict):
                self.roi_redline = r_red

            r_green = cam.get("roi_greenline")
            if isinstance(r_green, str):
                try: r_green = json.loads(r_green)
                except: pass
            if isinstance(r_green, dict):
                self.roi_greenline = r_green

    def _reader_loop(self):
        logging.info(f"[FfbStreamer] Reader loop started for Line {self.line_no}")

        while self.running:
            self._sync_config_from_db()
            target_url = self.rtsp_url
            self.active_rtsp_url = target_url

            logging.info(f"[FfbStreamer] Connecting VideoCapture: '{self.camera_code}' -> {target_url[:45]}...")
            cap = cv2.VideoCapture(target_url, cv2.CAP_FFMPEG)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

            if not cap.isOpened():
                logging.warning(f"[FfbStreamer] RTSP connection failed for {self.camera_code}. Retrying in 2.5s...")
                with self.lock:
                    self.is_connected = False
                    self.raw_frame = None
                    self.latest_jpeg = create_fallback_frame(self.camera_code, f"Connecting to RTSP ({target_url[:35]}...)")
                time.sleep(2.5)
                continue

            with self.lock:
                self.is_connected = True

            while self.running and cap.isOpened():
                # Jika URL di database berubah, break dan buat koneksi baru
                if self.rtsp_url != self.active_rtsp_url:
                    logging.info(f"[FfbStreamer] Switching stream to new RTSP URL...")
                    break

                success, frame = cap.read()
                if not success or frame is None:
                    logging.warning(f"[FfbStreamer] Lost frame stream for {self.camera_code}. Reconnecting...")
                    break

                with self.lock:
                    self.raw_frame = frame
                    self.last_frame_time = time.time()

            with self.lock:
                self.is_connected = False
            cap.release()
            time.sleep(1.0)

    def _process_loop(self):
        logging.info(f"[FfbStreamer] Processing loop started for Line {self.line_no}")
        last_sync_time = time.time()

        while self.running:
            now = time.time()
            if now - last_sync_time > 2.0:
                self._sync_config_from_db()
                last_sync_time = now

            curr_frame = None
            is_stale = False

            with self.lock:
                if self.raw_frame is not None:
                    curr_frame = self.raw_frame.copy()
                if now - self.last_frame_time > 3.0:
                    is_stale = True

            if curr_frame is not None and not is_stale:
                # 0. Spatial Crop ke area aktif conveyor (Y: 500 -> 1280, X: 0 -> 720)
                # Pangkas area atap/chute atas Y: 0 -> 500, menyisakan 280 px buffer di atas Redline (Y=780)
                if curr_frame.shape[0] >= 1280 and curr_frame.shape[1] >= 720:
                    active_frame = curr_frame[CROP_Y_TOP:1280, 0:720].copy()
                else:
                    active_frame = curr_frame.copy()

                # Transformasi koordinat Redline & Greenline ke koordinat lokal active_frame (780 - 500 = 280)
                local_redline = {
                    "x1": int(self.roi_redline.get("x1", 0)),
                    "y1": max(0, int(self.roi_redline.get("y1", 780)) - CROP_Y_TOP),
                    "x2": int(self.roi_redline.get("x2", 720)),
                    "y2": max(0, int(self.roi_redline.get("y2", 780)) - CROP_Y_TOP)
                }
                local_greenline = {
                    "x1": int(self.roi_greenline.get("x1", 0)),
                    "y1": max(0, int(self.roi_greenline.get("y1", 780)) - CROP_Y_TOP),
                    "x2": int(self.roi_greenline.get("x2", 720)),
                    "y2": max(0, int(self.roi_greenline.get("y2", 1280)) - CROP_Y_TOP)
                }

                # 1. Overlay ROI pada frame murni tanpa manipulasi brightness/warna
                annotated_frame = draw_roi_overlays(active_frame, local_redline, local_greenline)
                
                # 2. Gambar overlay polygon inferensi YOLO saat ada siklus deteksi aktif
                with self.overlay_lock:
                    curr_dets = list(self.active_detections) if self.active_detections else []
                if curr_dets:
                    annotated_frame = draw_inference_polygons(annotated_frame, curr_dets)

                # 3. Simpan frame resolusi aktif untuk keperluan logging / internal
                with self.lock:
                    self.latest_frame = annotated_frame

                # 4. Preview Web: Resolusi 360x390 (aspek rasio 720:780 presisi 12:13) & JPEG quality 78%
                preview_frame = cv2.resize(annotated_frame, (360, 390), interpolation=cv2.INTER_AREA)
                ret, buffer = cv2.imencode('.jpg', preview_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 78])
                if ret:
                    jpeg_bytes = buffer.tobytes()
                    with self.lock:
                        self.latest_jpeg = jpeg_bytes
            elif not self.is_connected or is_stale:
                with self.lock:
                    self.latest_jpeg = create_fallback_frame(
                        self.camera_code, 
                        f"Connecting to RTSP ({self.rtsp_url[:35]}...)"
                    )

            # Limit visual overlay & encode processing ke ~13.3 FPS (sangat mulus di mata & hemat bandwidth)
            time.sleep(0.075)

    def _ai_inference_loop(self):
        """
        Thread mandiri untuk inferensi AI YOLO:
        Berjalan secara decoupled di background sehingga komputasi model AI
        TIDAK PERNAH memperlambat streaming preview video di browser.
        """
        logging.info(f"[FfbStreamer] AI inference worker started for Line {self.line_no}")
        while self.running:
            try:
                from core.cycle_manager import cycle_manager
                from core.ffb_detector import detector_engine
                active_cycle_code = cycle_manager.get_active_cycle_code(self.line_no)

                if active_cycle_code and self.is_connected:
                    frame_to_eval = None
                    with self.lock:
                        if self.raw_frame is not None:
                            frame_to_eval = self.raw_frame.copy()

                    if frame_to_eval is not None:
                        # Spatial Crop ke area aktif conveyor (Y: 500 -> 1280, X: 0 -> 720)
                        if frame_to_eval.shape[0] >= 1280 and frame_to_eval.shape[1] >= 720:
                            cropped_eval_frame = frame_to_eval[CROP_Y_TOP:1280, 0:720].copy()
                        else:
                            cropped_eval_frame = frame_to_eval

                        # scan_y pada koordinat lokal frame terpotong (780 - 500 = 280)
                        scan_y_raw = int(self.roi_redline.get("y1", 780)) if isinstance(self.roi_redline, dict) else 780
                        scan_y_local = max(0, scan_y_raw - CROP_Y_TOP)

                        active_dets = detector_engine.evaluate_and_record_detection(
                            frame=cropped_eval_frame,
                            cycle_code=active_cycle_code,
                            line_no=self.line_no,
                            scan_line_y=scan_y_local,
                            camera_code=self.camera_code
                        )
                        with self.overlay_lock:
                            self.active_detections = active_dets or []
                    # Zero artificial delay untuk inference berkesinambungan
                    time.sleep(0.005)
                else:
                    with self.overlay_lock:
                        if self.active_detections:
                            self.active_detections = []
                    # Sleep saat idle siklus tidak aktif untuk efisiensi CPU
                    time.sleep(0.25)
            except Exception as e:
                logging.error(f"[FfbStreamer] AI inference loop exception: {e}")
                time.sleep(0.5)

    def get_latest_jpeg(self):
        with self.lock:
            if self.latest_jpeg:
                return self.latest_jpeg
            return create_fallback_frame(self.camera_code, "Initializing AI Vision Feed...")

    def get_fullres_frame(self):
        """Mengambil frame resolusi aktif (780x720) untuk pemrosesan AI lokal di server"""
        with self.lock:
            if self.latest_frame is not None:
                return self.latest_frame.copy()
            if self.raw_frame is not None:
                if self.raw_frame.shape[0] >= 1280 and self.raw_frame.shape[1] >= 720:
                    return self.raw_frame[CROP_Y_TOP:1280, 0:720].copy()
                return self.raw_frame.copy()
            return None

# Global Streamer Instance Pool
_stream_instances = {}
_stream_lock = threading.Lock()

def get_streamer(line_no=1):
    with _stream_lock:
        if line_no not in _stream_instances:
            _stream_instances[line_no] = FfbCameraStreamManager(line_no)
        return _stream_instances[line_no]

def generate_mjpeg_stream(line_no=1):
    streamer = get_streamer(line_no)
    try:
        while True:
            jpeg_bytes = streamer.get_latest_jpeg()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + jpeg_bytes + b'\r\n')
            time.sleep(0.075)
    except (GeneratorExit, BrokenPipeError, ConnectionResetError):
        pass
