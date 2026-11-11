# ═══════════════════════════════════════════════════════════════════════
# REST API ROUTES: REGION OF INTEREST (ROI) CONFIGURATION ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════

from flask import Blueprint, jsonify, request
from config.database import get_db_ai_connection

roi_bp = Blueprint('roi_bp', __name__)

@roi_bp.route('/api/security-ai/roi', methods=['GET'])
def get_roi_configs():
    """
    // ISI DISINI UNTUK LOGIC A I U E O: MENGAMBIL DAFTAR KOORDINAT ROI KAMERA DARI DB AI
    """
    camera_code = request.args.get('camera_code')
    try:
        conn = get_db_ai_connection()
        with conn.cursor() as cursor:
            if camera_code:
                cursor.execute("SELECT * FROM security_ai_roi_configs WHERE camera_code = %s AND is_active = 1", (camera_code,))
            else:
                cursor.execute("SELECT * FROM security_ai_roi_configs WHERE is_active = 1")
            results = cursor.fetchall()
        conn.close()
        return jsonify({"success": True, "data": results})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@roi_bp.route('/api/security-ai/roi', methods=['POST'])
def save_roi_config():
    """
    // ISI DISINI UNTUK LOGIC A I U E O: MENYIMPAN HASIL KOORDINAT ROI DARI UI SISI "UMUM"
    """
    data = request.json or {}
    camera_code = data.get('camera_code')
    roi_name = data.get('roi_name', 'Area ROI Baru')
    roi_type = data.get('roi_type', 'GENERAL_ZONE')
    coordinates_json = str(data.get('coordinates_json', '[]'))
    
    if not camera_code:
        return jsonify({"success": False, "message": "camera_code wajib diisi"}), 400
        
    try:
        conn = get_db_ai_connection()
        with conn.cursor() as cursor:
            sql = """
                INSERT INTO security_ai_roi_configs (camera_code, roi_name, roi_type, coordinates_json)
                VALUES (%s, %s, %s, %s)
            """
            cursor.execute(sql, (camera_code, roi_name, roi_type, coordinates_json))
        conn.close()
        return jsonify({"success": True, "message": "ROI Config berhasil disimpan"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
