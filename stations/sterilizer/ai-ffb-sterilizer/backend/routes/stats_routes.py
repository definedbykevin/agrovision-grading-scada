# ═══════════════════════════════════════════════════════════════════════
# STATS ROUTES: TELEMETRY & DECISION ENDPOINTS FOR FRONTEND TABS
# ═══════════════════════════════════════════════════════════════════════

# pyrefly: ignore[missing-import]
from flask import Blueprint, jsonify, request
from core.cycle_manager import cycle_manager

stats_bp = Blueprint('stats_bp', __name__)

@stats_bp.route('/stats', methods=['GET'])
@stats_bp.route('/api/sterilizer-ai/stats', methods=['GET'])
def get_stats():
    """
    Endpoint telemetri kategori buah (overripe, ripe, underripe) & recent captures riil per siklus
    Mendukung paginasi slide foto: ?line_no=1&slide=1&limit=12
    """
    line_no = request.args.get('line_no', type=int, default=1)
    slide = request.args.get('slide', type=int, default=1)
    limit = request.args.get('limit', type=int, default=12)
    return jsonify(cycle_manager.get_cycle_stats_and_captures(line_no, slide=slide, limit=limit))

@stats_bp.route('/current', methods=['GET'])
@stats_bp.route('/api/sterilizer-ai/current', methods=['GET'])
def get_current_decision():
    """
    Endpoint rekomendasi recipe siklus sterilizer berdasarkan mayoritas fraksi buah
    """
    line_no = request.args.get('line_no', type=int, default=1)
    return jsonify(cycle_manager.get_current_decision(line_no))

