# ═══════════════════════════════════════════════════════════════════════
# REST API ROUTES: AI ANALYTICS FOR 5 VISION FEATURES & RECOMMENDATIONS
# ═══════════════════════════════════════════════════════════════════════

from flask import Blueprint, jsonify, request
from config.database import get_db_ai_connection

analytics_bp = Blueprint('analytics_bp', __name__)

@analytics_bp.route('/api/security-ai/analytics/apd', methods=['GET'])
def get_apd_analytics():
    """// ISI DISINI UNTUK LOGIC A I U E O: GET LOG TELEMETRI APD"""
    try:
        conn = get_db_ai_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM security_ai_apd_logs ORDER BY id DESC LIMIT 50")
            logs = cursor.fetchall()
        conn.close()
        return jsonify({"success": True, "data": logs})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@analytics_bp.route('/api/security-ai/analytics/fire', methods=['GET'])
def get_fire_analytics():
    """// ISI DISINI UNTUK LOGIC A I U E O: GET LOG TELEMETRI FIRE"""
    try:
        conn = get_db_ai_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM security_ai_fire_logs ORDER BY id DESC LIMIT 50")
            logs = cursor.fetchall()
        conn.close()
        return jsonify({"success": True, "data": logs})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@analytics_bp.route('/api/security-ai/analytics/human', methods=['GET'])
def get_human_analytics():
    """// ISI DISINI UNTUK LOGIC A I U E O: GET LOG TELEMETRI HUMAN TRESPASSER"""
    try:
        conn = get_db_ai_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM security_ai_human_logs ORDER BY id DESC LIMIT 50")
            logs = cursor.fetchall()
        conn.close()
        return jsonify({"success": True, "data": logs})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@analytics_bp.route('/api/security-ai/analytics/lpr', methods=['GET'])
def get_lpr_analytics():
    """// ISI DISINI UNTUK LOGIC A I U E O: GET LOG TELEMETRI LPR OCR PLAT NOMOR"""
    try:
        conn = get_db_ai_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM security_ai_lpr_logs ORDER BY id DESC LIMIT 50")
            logs = cursor.fetchall()
        conn.close()
        return jsonify({"success": True, "data": logs})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@analytics_bp.route('/api/security-ai/analytics/oildispatch', methods=['GET'])
def get_oildispatch_analytics():
    """// ISI DISINI UNTUK LOGIC A I U E O: GET LOG TELEMETRI OIL DISPATCHING"""
    try:
        conn = get_db_ai_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM security_ai_oildispatch_logs ORDER BY id DESC LIMIT 50")
            logs = cursor.fetchall()
        conn.close()
        return jsonify({"success": True, "data": logs})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@analytics_bp.route('/api/security-ai/recommendations', methods=['GET'])
def get_ai_recommendations():
    """// ISI DISINI UNTUK LOGIC A I U E O: GET DAFTAR REKOMENDASI KEPUTUSAN AI (DSS)"""
    try:
        conn = get_db_ai_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM security_ai_recommendations ORDER BY id DESC LIMIT 20")
            recs = cursor.fetchall()
        conn.close()
        return jsonify({"success": True, "data": recs})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@analytics_bp.route('/api/security-ai/analytics/detection-logs', methods=['GET'])
def get_detection_logs():
    """
    GET Master Detection Logs (Mendukung query parameter ?station_slug=... & ?category=... & ?limit=... & ?page=...)
    """
    station_slug = request.args.get('station_slug')
    category = request.args.get('category')
    limit = int(request.args.get('limit', 11))
    page = int(request.args.get('page', 1))
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    offset = (page - 1) * limit

    try:
        conn = get_db_ai_connection()
        with conn.cursor() as cursor:
            where_conditions = []
            params = []

            if station_slug and station_slug != 'all-stations':
                where_conditions.append("REPLACE(station_slug, '_', '-') = REPLACE(%s, '_', '-')")
                params.append(station_slug)

            if category and category.upper() not in ['ALL', 'ALL CATEGORIES', 'ALL-CATEGORIES']:
                where_conditions.append("category = %s")
                params.append(category.upper())

            if start_date:
                # normalize ISO T/Z if needed, e.g. 2026-08-07T00:00:00Z -> 2026-08-07 00:00:00
                clean_start = start_date.replace('T', ' ').replace('Z', '').split('.')[0]
                where_conditions.append("detected_at >= %s")
                params.append(clean_start)

            if end_date:
                clean_end = end_date.replace('T', ' ').replace('Z', '').split('.')[0]
                where_conditions.append("detected_at <= %s")
                params.append(clean_end)

            where_clause = (" WHERE " + " AND ".join(where_conditions)) if where_conditions else ""

            count_sql = f"SELECT COUNT(*) as total FROM security_ai_detection_logs{where_clause}"
            cursor.execute(count_sql, tuple(params))
            total = cursor.fetchone().get('total', 0)

            sql = f"SELECT * FROM security_ai_detection_logs{where_clause} ORDER BY detected_at DESC, id DESC LIMIT %s OFFSET %s"
            cursor.execute(sql, tuple(params + [limit, offset]))
            logs = cursor.fetchall()

            for log in logs:
                if log.get('detected_at'):
                    log['detected_at'] = str(log['detected_at'])
        conn.close()

        import math
        total_pages = math.ceil(total / limit) if limit > 0 else 1
        return jsonify({
            "success": True,
            "data": logs,
            "pagination": {
                "total": total,
                "page": page,
                "limit": limit,
                "totalPages": max(total_pages, 1)
            }
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500