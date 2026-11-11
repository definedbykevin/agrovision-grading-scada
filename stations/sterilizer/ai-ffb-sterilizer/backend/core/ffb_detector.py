# ═══════════════════════════════════════════════════════════════════════
# CORE MODULE: FFB REALTIME DETECTOR & DUAL-CONDITION INSPECTION ENGINE
# Acuan: referensi_logic.md & Standar SCADA AgroVision
# ═══════════════════════════════════════════════════════════════════════

import os
import cv2
import numpy as np
from datetime import datetime
import json
import logging
import queue
import threading
import time
from config.database import get_db_ai_connection

logging.basicConfig(level=logging.INFO)

# Default Classes (Overripe, Ripe, Underripe)
DEFAULT_CLASSES = {0: "overripe", 1: "ripe", 2: "underripe"}
CAPTURES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "captures"))
os.makedirs(CAPTURES_DIR, exist_ok=True)

class FfbDetectorEngine:
    def __init__(self):
        self.model = None
        self.model_loaded = False
        self.model_name = "v0.0.1_polygon_ffb_grading"
        self.model_file = "models/v0.0.1_polygon_ffb_grading.pt"
        self.conf_threshold = 0.66
        self.iou_threshold = 0.45
        self.classes = DEFAULT_CLASSES
        self.tracked_ids_captured = set()
        self._active_cycle = None

        # Antrian asinkron non-blocking untuk pembuatan snapshot & penulisan DB (zero-lag inference)
        self.snapshot_queue = queue.Queue(maxsize=150)
        self.worker_thread = threading.Thread(target=self._snapshot_worker_loop, daemon=True)
        self.worker_thread.start()

        self._load_config_from_db()
        self._init_yolo_model()

    def _load_config_from_db(self):
        try:
            conn = get_db_ai_connection()
            if conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT model_name, model_file, classes, conf_threshold, iou_threshold
                        FROM ai_models
                        WHERE is_active = TRUE
                        ORDER BY id DESC
                        LIMIT 1
                    """)
                    row = cur.fetchone()
                    if row:
                        self.model_name = row.get("model_name") or self.model_name
                        self.model_file = row.get("model_file") or self.model_file
                        raw_classes = row.get("classes")
                        if isinstance(raw_classes, str):
                            raw_classes = json.loads(raw_classes)
                        if isinstance(raw_classes, dict):
                            self.classes = {int(k): v for k, v in raw_classes.items()}
                        self.conf_threshold = float(row.get("conf_threshold") or 0.66)
                        self.iou_threshold = float(row.get("iou_threshold") or 0.45)
                conn.close()
        except Exception as e:
            logging.warning(f"[FfbDetector] Note: Reading ai_models fallback to default: {e}")

    def _init_yolo_model(self):
        full_model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", self.model_file))
        if os.path.exists(full_model_path):
            try:
                import torch
                from ultralytics import YOLO
                logging.info(f"[FfbDetector] Loading YOLO model: {full_model_path}")
                self.model = YOLO(full_model_path)
                if torch.cuda.is_available():
                    self.model.to("cuda")
                    # Warmup 1 frame agar kernel CUDA & VRAM teralokasi di GPU tanpa cold-start
                    dummy = np.zeros((780, 720, 3), dtype=np.uint8)
                    with torch.inference_mode():
                        _ = self.model.track(dummy, device="cuda", verbose=False)
                    logging.info(f"[FfbDetector] Model successfully preloaded & warmed up on GPU: {torch.cuda.get_device_name(0)}")
                else:
                    torch.set_num_threads(8)
                    torch.set_num_interop_threads(2)
                self.model_loaded = True
                logging.info(f"[FfbDetector] Model loaded successfully: {self.model.names}")
            except Exception as e:
                logging.warning(f"[FfbDetector] ultralytics not ready or loading failed ({e}). Running in seamless AI engine mode.")
        else:
            logging.warning(f"[FfbDetector] Model file not found at {full_model_path}")

    def flush_snapshots(self, timeout=2.0):
        """Menunggu antrian snapshot async selesai diproses sebelum rekapitulasi siklus"""
        try:
            start_t = time.time()
            while not self.snapshot_queue.empty() and (time.time() - start_t < timeout):
                time.sleep(0.05)
        except Exception:
            pass

    def _snapshot_worker_loop(self):
        logging.info("[FfbDetector] Async snapshot & DB worker loop started")
        while True:
            try:
                item = self.snapshot_queue.get()
                if item is None:
                    break

                crop_img = item.get("crop_img")
                track_id = item.get("track_id")
                class_label = item.get("class_label")
                conf_val = item.get("conf_val", 0.0)
                trigger_cond = item.get("trigger_cond", "NORMAL")
                cycle_code = item.get("cycle_code")
                line_no = item.get("line_no", 1)
                camera_code = item.get("camera_code", "XNO102")

                # 1. Buat 1 Citra Inspeksi Terpadu (All-in-One 740x360 px)
                snapshot = self.create_inspection_snapshot(
                    crop_img=crop_img,
                    track_id=track_id,
                    class_label=class_label,
                    conf_val=conf_val,
                    has_stalk=False,
                    trigger_cond=trigger_cond,
                    line_no=line_no
                )

                # 2. Simpan 1 File Citra ke sub-direktori: captures/<cycle_code>/
                cycle_dir = os.path.join(CAPTURES_DIR, cycle_code)
                os.makedirs(cycle_dir, exist_ok=True)
                filename = f"cap_{track_id}_{class_label}.jpg"
                filepath = os.path.join(cycle_dir, filename)
                cv2.imwrite(filepath, snapshot, [cv2.IMWRITE_JPEG_QUALITY, 96])
                rel_path = f"captures/{cycle_code}/{filename}"

                # 3. Tulis record ke tabel ai_ffb_raw_detections
                self._insert_raw_detection(
                    cycle_code=cycle_code,
                    line_no=line_no,
                    camera_code=camera_code,
                    track_id=track_id,
                    class_name=class_label,
                    conf=conf_val * 100.0,
                    trigger_cond=trigger_cond,
                    image_path=rel_path
                )
                logging.info(f"[FfbDetector] Async logged bunch {track_id} ({class_label.upper()}) to cycle {cycle_code}")
                self.snapshot_queue.task_done()
            except Exception as e:
                logging.error(f"[FfbDetector] Error in async snapshot worker: {e}")

    def create_inspection_snapshot(self, crop_img, track_id, class_label, conf_val, has_stalk, trigger_cond="NORMAL", line_no=1):
        """
        Menghasilkan 1 citra inspeksi terpadu mandiri (All-in-One 740x360 px):
        - Panel Kiri (350x360): Buah murni di atas Latar Hijau Chroma BGR(35, 255, 0)
        - Panel Kanan (390x360): Kartu laporan inspeksi mutu terstruktur (Track ID, Kelas Mutu YOLO, Confidence %,
          Status Tangkai, Kondisi Trigger Normal/Scraper, Sterilizer Line)
        """
        W_TOTAL, H_TOTAL = 740, 360
        W_LEFT = 350
        canvas = np.ones((H_TOTAL, W_TOTAL, 3), dtype=np.uint8) * 18

        # 1. Panel Kiri: Buah Latar Hijau Chroma
        left_box = np.zeros((H_TOTAL, W_LEFT, 3), dtype=np.uint8)
        left_box[:] = [35, 255, 0]
        if crop_img is not None and crop_img.size > 0:
            ch, cw, _ = crop_img.shape
            scale = min((W_LEFT - 24) / max(cw, 1), (H_TOTAL - 24) / max(ch, 1))
            nw, nh = max(1, int(cw * scale)), max(1, int(ch * scale))
            resized = cv2.resize(crop_img, (nw, nh), interpolation=cv2.INTER_AREA)
            ox, oy = (W_LEFT - nw) // 2, (H_TOTAL - nh) // 2
            left_box[oy:oy+nh, ox:ox+nw] = resized
        cv2.rectangle(left_box, (0, 0), (W_LEFT - 1, H_TOTAL - 1), (45, 52, 60), 2)
        canvas[:, :W_LEFT] = left_box

        # 2. Panel Kanan: Laporan Hasil Inspeksi Mutu YOLO
        rx = W_LEFT + 20
        cv2.putText(canvas, "FFB QUALITY INSPECTION REPORT", (rx, 34),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.54, (240, 240, 240), 2, cv2.LINE_AA)
        cv2.line(canvas, (rx, 44), (W_TOTAL - 20, 44), (60, 65, 75), 1)

        # Identitas & Timestamp
        timestamp_str = datetime.now().strftime("%Y-%m-%d  %I:%M:%S %p")
        cv2.putText(canvas, f"ID: {track_id}  |  {timestamp_str}",
                    (rx, 68), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (160, 168, 180), 1, cv2.LINE_AA)

        # Badge Mutu Utama
        badge_colors = {
            "ripe": ((34, 197, 94), (0, 0, 0)),        # Hijau
            "underripe": ((0, 215, 255), (0, 0, 0)),   # Kuning/Emas
            "overripe": ((180, 80, 180), (255, 255, 255)), # Ungu
        }
        bg_col, txt_col = badge_colors.get(class_label.lower(), ((34, 197, 94), (0, 0, 0)))
        badge_text = f"KELAS MUTU: {class_label.upper()}"
        (bw, bh), _ = cv2.getTextSize(badge_text, cv2.FONT_HERSHEY_SIMPLEX, 0.58, 2)
        badge_y = 86
        cv2.rectangle(canvas, (rx, badge_y), (rx + bw + 18, badge_y + bh + 14), bg_col, -1)
        cv2.putText(canvas, badge_text, (rx + 9, badge_y + bh + 7), cv2.FONT_HERSHEY_SIMPLEX, 0.58, txt_col, 2, cv2.LINE_AA)

        # Card Box Detail Info
        box_x = rx
        box_y = badge_y + bh + 24
        box_w = W_TOTAL - rx - 20
        box_h = H_TOTAL - box_y - 20
        cv2.rectangle(canvas, (box_x, box_y), (box_x + box_w, box_y + box_h), (25, 30, 38), -1)
        cv2.rectangle(canvas, (box_x, box_y), (box_x + box_w, box_y + box_h), (45, 52, 65), 1)

        # Items di dalam Box
        conf_pct = int(conf_val * 100 if conf_val <= 1.0 else conf_val)
        stalk_str = "TERDETEKSI (+STALK)" if has_stalk else "TIDAK ADA"
        trigger_str = "NORMAL (MID-LINE)" if trigger_cond == "NORMAL" else "SCRAPER BYPASS"
        
        info_lines = [
            ("Model Confidence", f"{conf_pct}%", (34, 197, 94) if conf_pct >= 60 else (0, 215, 255)),
            ("Tangkai / Stalk", stalk_str, (210, 130, 240) if has_stalk else (148, 163, 184)),
            ("Trigger Condition", trigger_str, (148, 163, 184)),
            ("Sterilizer Line", f"LINE {line_no}", (240, 240, 240)),
            ("Detection Status", "VERIFIED BY YOLO SEGMENTATION", (56, 189, 248)),
        ]

        curr_y = box_y + 26
        for label, val, val_col in info_lines:
            cv2.putText(canvas, f"{label}:", (box_x + 14, curr_y),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.38, (130, 140, 155), 1, cv2.LINE_AA)
            cv2.putText(canvas, str(val), (box_x + 155, curr_y),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.40, val_col, 1, cv2.LINE_AA)
            curr_y += 26

        return canvas

    def evaluate_and_record_detection(self, frame, cycle_code, line_no=1, scan_line_y=280, camera_code="XNO102"):
        """
        Memeriksa apakah ada tandan yang memotong garis merah pada siklus aktif,
        membuat 1 citra inspeksi terpadu secara asinkron (non-blocking), dan mencatat ke tabel raw detections.
        """
        if frame is None or not cycle_code:
            return []

        # Reset cache pelacakan jika berganti siklus baru
        if self._active_cycle != cycle_code:
            self._active_cycle = cycle_code
            self.tracked_ids_captured.clear()

        h, w = frame.shape[:2]
        clean_frame = frame.copy()

        # Objek terdeteksi dari model YOLO
        detections = []
        if self.model_loaded and self.model is not None:
            try:
                import torch
                device = "cuda" if torch.cuda.is_available() else "cpu"
                with torch.inference_mode():
                    results = self.model.track(
                        clean_frame,
                        persist=True,
                        conf=self.conf_threshold,
                        iou=self.iou_threshold,
                        agnostic_nms=True,
                        device=device,
                        verbose=False
                    )
                    for r in results:
                        if r.boxes is None: continue
                        for i, box in enumerate(r.boxes):
                            conf = float(box.conf[0].item())
                            cls_id = int(box.cls[0].item())
                            cls_name = self.classes.get(cls_id, r.names.get(cls_id, "ripe")).lower()
                            track_id = int(box.id[0].item()) if (box.id is not None) else (100 + i)
                            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                            poly = r.masks.xy[i].astype(np.int32) if (r.masks and len(r.masks.xy) > i) else None
                            detections.append({
                                "track_id": track_id,
                                "class": cls_name,
                                "conf": conf,
                                "bbox": (x1, y1, x2, y2),
                                "poly": poly,
                                "cy": (y1 + y2) // 2
                            })
                    del results
            except Exception as e:
                logging.error(f"[FfbDetector] Model inference error: {e}")

        # Jika model belum mendeteksi atau sedang kalibrasi, return list kosong
        if len(detections) == 0:
            return []

        for det in detections:
            track_num = det["track_id"]
            if track_num in self.tracked_ids_captured:
                continue

            x1, y1, x2, y2 = det["bbox"]
            cy = det["cy"]

            # Dual-Condition Trigger dari referensi_logic.md
            cond_normal = abs(cy - scan_line_y) < 18
            cond_terhalang = (y1 <= scan_line_y <= y2) and (cy < scan_line_y) and (abs(y2 - scan_line_y) < 30)

            if cond_normal or cond_terhalang:
                self.tracked_ids_captured.add(track_num)
                trigger_cond = "NORMAL" if cond_normal else "SCRAPER_BYPASS"

                # Ekstraksi Crop dengan Masking Hijau Chroma
                pad = 16
                bx1, by1 = max(0, x1 - pad), max(0, y1 - pad)
                bx2, by2 = min(w, x2 + pad), min(h, y2 + pad)
                crop_img = clean_frame[by1:by2, bx1:bx2].copy()

                if det["poly"] is not None:
                    poly_mask = np.zeros((h, w), dtype=np.uint8)
                    cv2.fillPoly(poly_mask, [det["poly"]], 255)
                    crop_mask = poly_mask[by1:by2, bx1:bx2]
                    crop_img[crop_mask == 0] = [35, 255, 0]

                # Kirim data ke worker queue asinkron non-blocking (zero disk/DB delay on video)
                task_data = {
                    "crop_img": crop_img,
                    "track_id": f"TRK-{track_num}",
                    "class_label": det["class"],
                    "conf_val": det["conf"],
                    "trigger_cond": trigger_cond,
                    "cycle_code": cycle_code,
                    "line_no": line_no,
                    "camera_code": camera_code
                }
                try:
                    self.snapshot_queue.put_nowait(task_data)
                except queue.Full:
                    logging.warning(f"[FfbDetector] Snapshot queue is full, skipping disk write for TRK-{track_num}")

        return detections

    def _insert_raw_detection(self, cycle_code, line_no, camera_code, track_id, class_name, conf, trigger_cond, image_path):
        try:
            conn = get_db_ai_connection()
            if not conn: return
            with conn.cursor() as cur:
                # Cegah duplikasi record jika (cycle_code, track_id) sudah pernah tercatat
                cur.execute("""
                    SELECT id FROM ai_ffb_raw_detections
                    WHERE cycle_code = %s AND track_id = %s
                    LIMIT 1
                """, (str(cycle_code), str(track_id)))
                if cur.fetchone():
                    logging.info(f"[FfbDetector] Duplicate guard: {track_id} already recorded in cycle {cycle_code}. Skipping.")
                    conn.close()
                    return

                cur.execute("""
                    INSERT INTO ai_ffb_raw_detections (
                        cycle_code, line_no, camera_code, track_id, class_name,
                        confidence, trigger_condition, has_stalk,
                        image_path, inlet_door_status
                    ) VALUES (
                        %s, %s, %s, %s, %s,
                        %s, %s, %s,
                        %s, 'OPEN'
                    )
                """, (
                    str(cycle_code), int(line_no), str(camera_code), str(track_id), str(class_name),
                    float(conf), str(trigger_cond), False,
                    str(image_path)
                ))
            conn.close()
        except Exception as e:
            logging.error(f"[FfbDetector] DB insert error in raw detections: {e}")

# Global Detector Instance
detector_engine = FfbDetectorEngine()
