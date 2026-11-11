# ═══════════════════════════════════════════════════════════════════════
# CORE MODULE: REGION OF INTEREST (ROI) PROCESSOR
# ═══════════════════════════════════════════════════════════════════════

import logging

logging.basicConfig(level=logging.INFO)

def crop_frame_by_roi(frame, coordinates):
    """
    // ISI DISINI UNTUK LOGIC A I U E O: MEMOTONG (CROP) FRAME BERDASARKAN KOORDINAT ROI DARI FRONTEND
    
    Langkah Logika:
    1. // Terima koordinat Polygon / Bounding Box `[{"x": 100, "y": 150}, ...]` dari Tab UI.
    2. // Buat masking Numpy array atau crop Bounding Box Bounding Rect.
    3. // Return frame hasil potong untuk diproses oleh model YOLO/AI.
    """
    logging.info("[ROIProcessor] Cropping frame by ROI coordinates...")
    return frame

def is_point_inside_roi(point, roi_polygon):
    """
    // ISI DISINI UNTUK LOGIC A I U E O: CEK APABILA DUA KOORDINAT (X,Y) OBJEK BERADA DI DALAM POLIGON ROI
    """
    return True
