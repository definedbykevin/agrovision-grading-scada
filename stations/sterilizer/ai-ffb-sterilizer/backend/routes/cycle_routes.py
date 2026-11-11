# ═══════════════════════════════════════════════════════════════════════
# CYCLE ROUTES: API FOR INLET SIMULATION & CYCLE SUMMARY MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════

import os
import math
# pyrefly: ignore[missing-import]
from flask import Blueprint, jsonify, request, send_from_directory
from core.cycle_manager import cycle_manager
from config.database import get_db_ai_connection

cycle_bp = Blueprint('cycle_bp', __name__)
CAPTURES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "captures"))

def _get_active_and_latest_line(lines_status):
    active_line = None
    for l_num in [1, 2, 3, 4]:
        if lines_status.get(str(l_num), {}).get("is_active"):
            active_line = l_num
            break

    latest_completed_line = None
    try:
        conn = get_db_ai_connection()
        if conn:
            with conn.cursor() as cur:
                cur.execute("SELECT line_no FROM ai_ffb_cycle_summaries ORDER BY id DESC LIMIT 1")
                row = cur.fetchone()
                if row and row.get("line_no"):
                    latest_completed_line = int(row["line_no"])
            conn.close()
    except Exception:
        pass

    return active_line, latest_completed_line

@cycle_bp.route('/cycle/status', methods=['GET'])
@cycle_bp.route('/api/sterilizer-ai/cycle/status', methods=['GET'])
def get_cycle_status():
    """Mengembalikan status deteksi siklus untuk seluruh line (1..4)"""
    lines_status = cycle_manager.get_all_status()
    active_line, latest_completed_line = _get_active_and_latest_line(lines_status)
    return jsonify({
        "success": True,
        "lines": lines_status,
        "active_line": active_line,
        "latest_completed_line": latest_completed_line
    })

@cycle_bp.route('/cycle/toggle', methods=['POST'])
@cycle_bp.route('/api/sterilizer-ai/cycle/toggle', methods=['POST'])
def toggle_cycle():
    """
    Simulasi tombol buka/tutup inlet door untuk Line 1..4:
    - Jika idle -> Memulai siklus baru (Inlet OPEN)
    - Jika aktif -> Menyelesaikan siklus & generate rekapitulasi (Inlet CLOSED)
    """
    data = request.get_json() or {}
    line_no = int(data.get("line_no", 1))
    action = data.get("action") # 'start', 'stop', or None (auto toggle)

    is_active = cycle_manager.is_line_active(line_no)
    if action == "start" or (action is None and not is_active):
        result = cycle_manager.start_cycle(line_no)
    else:
        result = cycle_manager.stop_cycle(line_no)

    lines_status = cycle_manager.get_all_status()
    active_line, latest_completed_line = _get_active_and_latest_line(lines_status)
    result["current_status"] = lines_status
    result["active_line"] = active_line
    result["latest_completed_line"] = latest_completed_line
    result["target_line"] = line_no
    return jsonify(result)

@cycle_bp.route('/captures/<path:filename>', methods=['GET'])
@cycle_bp.route('/api/sterilizer-ai/captures/<path:filename>', methods=['GET'])
def serve_capture(filename):
    """Menyajikan 1 file citra inspeksi terpadu (740x360 px)"""
    return send_from_directory(CAPTURES_DIR, filename)

@cycle_bp.route('/detections/raw', methods=['GET'])
@cycle_bp.route('/api/sterilizer-ai/detections/raw', methods=['GET'])
def get_raw_detections():
    """Mengambil riwayat deteksi mentahan per tandan dengan pagination & filter kategori"""
    line_no = request.args.get("line_no", type=int)
    cycle_code = request.args.get("cycle_code")
    class_name = request.args.get("class_name") or request.args.get("category")
    limit = request.args.get("limit", type=int, default=50)
    page = request.args.get("page", type=int, default=1)
    if page < 1:
        page = 1
    if limit < 1:
        limit = 50
    if limit > 1000:
        limit = 1000

    offset = request.args.get("offset", type=int)
    if offset is None:
        offset = (page - 1) * limit
    if offset < 0:
        offset = 0

    try:
        conn = get_db_ai_connection()
        if not conn:
            return jsonify({"success": False, "message": "Database unreachable"}), 500

        where_clauses = ["1=1"]
        params = []
        if line_no:
            where_clauses.append("line_no = %s")
            params.append(line_no)
        if cycle_code:
            where_clauses.append("cycle_code = %s")
            params.append(cycle_code)
        if class_name and class_name.upper() != "ALL":
            where_clauses.append("LOWER(class_name) = LOWER(%s)")
            params.append(class_name)

        where_sql = " AND ".join(where_clauses)
        count_query = f"SELECT COUNT(*) as total FROM ai_ffb_raw_detections WHERE {where_sql}"
        data_query = f"SELECT * FROM ai_ffb_raw_detections WHERE {where_sql} ORDER BY id DESC LIMIT %s OFFSET %s"

        with conn.cursor() as cur:
            cur.execute(count_query, tuple(params))
            total_row = cur.fetchone()
            total = total_row["total"] if total_row else 0

            data_params = list(params) + [limit, offset]
            cur.execute(data_query, tuple(data_params))
            rows = cur.fetchall()
        conn.close()

        for r in rows:
            if r.get("detected_at"):
                r["detected_at"] = r["detected_at"].isoformat()

        total_pages = math.ceil(total / limit) if total > 0 else 1

        return jsonify({
            "success": True,
            "count": len(rows),
            "total": total,
            "page": page,
            "limit": limit,
            "offset": offset,
            "total_pages": total_pages,
            "data": rows
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@cycle_bp.route('/cycles/summaries', methods=['GET'])
@cycle_bp.route('/api/sterilizer-ai/cycles/summaries', methods=['GET'])
def get_cycle_summaries():
    """Mengambil riwayat rekapitulasi siklus sterilizer"""
    line_no = request.args.get("line_no", type=int)
    limit = request.args.get("limit", type=int, default=20)

    try:
        conn = get_db_ai_connection()
        if not conn:
            return jsonify({"success": False, "message": "Database unreachable"}), 500

        query = "SELECT * FROM ai_ffb_cycle_summaries WHERE 1=1"
        params = []
        if line_no:
            query += " AND line_no = %s"
            params.append(line_no)

        query += " ORDER BY id DESC LIMIT %s"
        params.append(limit)

        with conn.cursor() as cur:
            cur.execute(query, tuple(params))
            rows = cur.fetchall()
        conn.close()

        for r in rows:
            if r.get("started_at"):
                r["started_at"] = r["started_at"].isoformat()
            if r.get("completed_at"):
                r["completed_at"] = r["completed_at"].isoformat()

        return jsonify({"success": True, "count": len(rows), "data": rows})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
