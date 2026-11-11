# ═══════════════════════════════════════════════════════════════════════
# STREAM ROUTES: MJPEG VIDEO STREAM FOR FRONTEND
# ═══════════════════════════════════════════════════════════════════════

# pyrefly: ignore[missing-import]
from flask import Blueprint, Response, request
from core.camera_streamer import generate_mjpeg_stream, get_streamer

stream_bp = Blueprint('stream_bp', __name__)

@stream_bp.route('/stream', methods=['GET'])
@stream_bp.route('/api/sterilizer-ai/stream', methods=['GET'])
def get_video_stream():
    """
    HTTP MJPEG Video Stream untuk Tab AiGradingTab.jsx Frontend:
    <img src="/api/sterilizer-ai/stream?line_no=1" />
    """
    line_no = request.args.get('line_no', type=int, default=1)
    
    response = Response(
        generate_mjpeg_stream(line_no),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    response.headers['X-Accel-Buffering'] = 'no'
    return response

@stream_bp.route('/snapshot', methods=['GET'])
@stream_bp.route('/api/sterilizer-ai/snapshot', methods=['GET'])
def get_single_snapshot():
    """
    Tangkap 1 snapshot frame JPEG resolusi tinggi
    """
    line_no = request.args.get('line_no', type=int, default=1)
    streamer = get_streamer(line_no)
    jpeg_bytes = streamer.get_latest_jpeg()
    return Response(jpeg_bytes, mimetype='image/jpeg')
