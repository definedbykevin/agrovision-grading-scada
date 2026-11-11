# ═══════════════════════════════════════════════════════════════════════
# CAMERA ROUTES: CRUD FOR ai_cameras TABLE (USED BY DEV CTRL+X)
# ═══════════════════════════════════════════════════════════════════════

# pyrefly: ignore[missing-import]
from flask import Blueprint, jsonify, request
from config.database import get_db_ai_connection
import json

camera_bp = Blueprint('camera_bp', __name__)

@camera_bp.route('/cameras', methods=['GET'])
@camera_bp.route('/api/sterilizer-ai/cameras', methods=['GET'])
def list_cameras():
    """
    Mengambil seluruh daftar kamera di tabel ai_cameras (agrovision_sterilizer_ai_ffb)
    """
    try:
        conn = get_db_ai_connection()
        if not conn:
            return jsonify({"success": False, "message": "Database unreachable"}), 500
        
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id, camera_code, rtsp_url, location, is_active, roi_redline, roi_greenline, created_at, updated_at
                FROM ai_cameras
                ORDER BY id ASC
            """)
            cameras = cursor.fetchall()
        conn.close()

        # Format datetime ke string ISO
        for cam in cameras:
            if cam.get('created_at'):
                cam['created_at'] = cam['created_at'].isoformat()
            if cam.get('updated_at'):
                cam['updated_at'] = cam['updated_at'].isoformat()

        return jsonify({"success": True, "data": cameras})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@camera_bp.route('/cameras/<int:camera_id>', methods=['PUT'])
@camera_bp.route('/api/sterilizer-ai/cameras/<int:camera_id>', methods=['PUT'])
def update_camera(camera_id):
    """
    Update konfigurasi kamera (RTSP, status, ROI red/green) langsung ke DB PostgreSQL
    """
    data = request.get_json() or {}
    rtsp_url = data.get('rtsp_url')
    location = data.get('location')
    is_active = data.get('is_active')
    roi_redline = data.get('roi_redline')
    roi_greenline = data.get('roi_greenline')

    try:
        conn = get_db_ai_connection()
        if not conn:
            return jsonify({"success": False, "message": "Database unreachable"}), 500

        with conn.cursor() as cursor:
            cursor.execute("""
                UPDATE ai_cameras
                SET 
                    rtsp_url = COALESCE(%s, rtsp_url),
                    location = COALESCE(%s, location),
                    is_active = COALESCE(%s, is_active),
                    roi_redline = COALESCE(%s, roi_redline),
                    roi_greenline = COALESCE(%s, roi_greenline),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING id, camera_code, rtsp_url, location, is_active, roi_redline, roi_greenline, updated_at
            """, (
                rtsp_url,
                location,
                is_active,
                json.dumps(roi_redline) if roi_redline is not None else None,
                json.dumps(roi_greenline) if roi_greenline is not None else None,
                camera_id
            ))
            updated_row = cursor.fetchone()

        conn.close()

        if not updated_row:
            return jsonify({"success": False, "message": f"Camera with ID {camera_id} not found"}), 404

        if updated_row.get('updated_at'):
            updated_row['updated_at'] = updated_row['updated_at'].isoformat()

        return jsonify({
            "success": True, 
            "message": f"Camera {updated_row['camera_code']} updated successfully", 
            "data": updated_row
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
