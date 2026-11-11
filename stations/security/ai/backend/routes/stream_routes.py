from flask import Blueprint, Response, jsonify, request
import re
from urllib.parse import parse_qsl
from werkzeug.datastructures import MultiDict
from core.live_delivery import LiveDelivery, deliveries, delivery_lock
from core.rtsp_streamer import (generate_mjpeg_stream_by_id, capture_single_snapshot,
                               get_camera_status, get_camera_info_by_id,
                               generate_combined_stream, get_live_camera_infos, stream_diagnostics)

stream_bp = Blueprint('stream_bp', __name__)


def live_options(args):
    camera_ids = list(dict.fromkeys(int(value) for value in args.get('ids', '').split(',')))
    if not camera_ids or len(camera_ids) > 256 or any(cid <= 0 for cid in camera_ids):
        raise ValueError('Invalid IDs')
    viewed_ids = None
    if 'view' in args:
        viewed_ids = {int(value) for value in args['view'].split(',') if value}
        if not viewed_ids.issubset(camera_ids):
            raise ValueError('Invalid viewed IDs')
    preview_width = None
    preview_fps = None
    if 'fps' in args:
        preview_fps = int(args['fps'])
        if not 1 <= preview_fps <= 30:
            raise ValueError('Invalid preview FPS')
    if 'width' in args:
        preview_width = int(args['width'])
        if not 160 <= preview_width <= 1280:
            raise ValueError('Invalid preview width')
    focus = int(args['focus']) if 'focus' in args else None
    if focus is not None and (focus not in camera_ids or viewed_ids is not None and focus not in viewed_ids):
        raise ValueError('Invalid focus')
    return dict(camera_ids=camera_ids, focus_id=focus, viewed_ids=viewed_ids,
                preview_width=preview_width, preview_fps=preview_fps)


@stream_bp.route('/api/security-ai/live/control/<token>', methods=['POST'])
def control_combined_stream(token):
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify(success=False, message='Expected delivery feedback'), 400
    try:
        query = body.get('query')
        if query is not None and (not isinstance(query, str) or len(query) > 16384):
            raise ValueError('Invalid subscription')
        options = live_options(MultiDict(parse_qsl(query, keep_blank_values=True))) if query is not None else None
        with delivery_lock:
            delivery = deliveries.get(token)
        if delivery is None:
            return jsonify(success=False, message='Live connection closed'), 404
        delivery.update(body.get('ack'), options)
    except (ValueError, TypeError):
        return jsonify(success=False, message='Invalid delivery feedback'), 400
    return jsonify(success=True)


@stream_bp.route('/api/security-ai/live', methods=['GET'])
def get_combined_stream():
    try:
        options = live_options(request.args)
        token = request.args.get('session')
        if token is not None and not re.fullmatch(r'[a-f0-9]{32}', token):
            raise ValueError('Invalid session')
    except ValueError:
        return jsonify(success=False, message='Expected 1-256 positive camera IDs and a valid view subset'), 400
    try:
        infos = get_live_camera_infos(options['camera_ids'])
    except Exception:
        return jsonify(success=False, message='Camera configuration unavailable'), 503
    delivery = LiveDelivery(options) if token else None
    if delivery:
        with delivery_lock:
            if token in deliveries:
                return jsonify(success=False, message='Live session already connected'), 409
            deliveries[token] = delivery
    def release():
        if delivery:
            with delivery_lock:
                if deliveries.get(token) is delivery:
                    del deliveries[token]
    def stream():
        try:
            yield from generate_combined_stream(camera_infos=infos, batch=True, delivery=delivery, **options)
        finally:
            release()
    response = Response(stream(), mimetype='application/octet-stream')
    response.call_on_close(release)
    response.headers['Cache-Control'] = 'no-store, no-transform'
    response.headers['X-Accel-Buffering'] = 'no'
    if delivery:
        response.headers['X-CCTV-Control'] = '1'
    return response


@stream_bp.route('/api/security-ai/stream/status', methods=['GET'])
def get_stream_status():
    return jsonify(success=True, data=stream_diagnostics())


def _id():
    value = int(request.args.get('camera_id', '1'))
    if value <= 0:
        raise ValueError('Invalid camera_id')
    return value


@stream_bp.route('/api/security-ai/stream')
def get_video_stream():
    try:
        camera_id = _id()
        row = get_camera_info_by_id(camera_id)
        if not row:
            return jsonify(success=False, message='Camera not found'), 404
        if not row['is_active']:
            return jsonify(success=False, message='Camera disabled'), 409
    except ValueError:
        return jsonify(success=False, message='Invalid camera_id'), 400
    except Exception:
        return jsonify(success=False, message='Camera database unavailable'), 503
    response = Response(generate_mjpeg_stream_by_id(camera_id),
                        mimetype='multipart/x-mixed-replace; boundary=frame')
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['X-Accel-Buffering'] = 'no'
    return response


@stream_bp.route('/api/security-ai/status')
def get_status():
    try:
        if 'camera_id' in request.args:
            data = get_camera_status(_id())
        else:
            # Existing cameras only, without starting any capture process.
            from config.database import get_db_general_connection
            conn = get_db_general_connection()
            try:
                with conn.cursor() as cursor:
                    cursor.execute('SELECT id FROM cctv_cameras ORDER BY id')
                    ids = [row['id'] for row in cursor.fetchall()]
            finally:
                conn.close()
            data = [get_camera_status(camera_id) for camera_id in ids]
        return jsonify(success=True, data=data)
    except ValueError:
        return jsonify(success=False, message='Invalid camera_id'), 400
    except Exception:
        return jsonify(success=False, message='Camera database unavailable'), 503


@stream_bp.route('/api/security-ai/snapshot')
def get_snapshot():
    try:
        return Response(capture_single_snapshot(_id()), mimetype='image/jpeg')
    except ValueError:
        return jsonify(success=False, message='Invalid, missing or disabled camera'), 400
    except Exception:
        return jsonify(success=False, message='Camera unavailable'), 503
