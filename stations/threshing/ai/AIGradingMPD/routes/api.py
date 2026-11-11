from __future__ import annotations

from copy import deepcopy

from flask import Blueprint, Response, jsonify, request

from config.settings import classification_config_store
from core.classification_service import classification_runtime
from core.rtsp_streamer import rtsp_registry
from database.repository import classification_repository


api_blueprint = Blueprint("threshing_mpd", __name__, url_prefix="/api/threshing-mpd")
ZERO_COUNTS = {"normal_cook": 0, "under_cook": 0, "over_cook": 0}


def _public_config(config: dict) -> dict:
    public = deepcopy(config)
    for line in public.get("lines", []):
        camera = line.setdefault("camera", {})
        url = camera.get("rtsp_url", "")
        camera["rtsp_configured"] = bool(url)
        camera["rtsp_url"] = "***configured***" if url else ""
    return public


@api_blueprint.get("/health")
def health():
    return jsonify({"service": "threshing-mpd-classification", **classification_runtime.status()})


@api_blueprint.get("/stream")
def stream():
    line_no = request.args.get("line_no", default=1, type=int)
    return Response(
        rtsp_registry.generate_mjpeg(line_no),
        mimetype="multipart/x-mixed-replace; boundary=frame",
        headers={"Cache-Control": "no-cache, no-store", "Pragma": "no-cache", "X-Accel-Buffering": "no"},
    )


@api_blueprint.get("/stats")
def stats():
    line_no = request.args.get("line_no", default=1, type=int)
    period = request.args.get("period", default="DAY").upper()
    if period not in {"DAY", "WEEK", "MONTH"}:
        return jsonify({"success": False, "message": "Invalid period", "counts": ZERO_COUNTS}), 400
    try:
        counts = classification_repository.get_stats(line_no, period)
        metrics = classification_repository.get_metrics(line_no, period)
        return jsonify({"success": True, "line_no": line_no, "period": period, "counts": counts, "metrics": metrics})
    except Exception as error:
        return jsonify({"success": False, "message": str(error), "line_no": line_no, "period": period, "counts": ZERO_COUNTS, "metrics": {"average_confidence": 0, "detections_per_minute": 0}})


@api_blueprint.get("/current")
def current():
    line_no = request.args.get("line_no", default=1, type=int)
    try:
        return jsonify({"success": True, "data": classification_repository.get_current_result(line_no)})
    except Exception as error:
        return jsonify({"success": False, "message": str(error), "data": None})


@api_blueprint.get("/config")
def get_config():
    return jsonify({"success": True, "data": _public_config(classification_runtime.config())})


@api_blueprint.put("/config")
def update_config():
    payload = request.get_json(silent=True) or {}
    try:
        existing = classification_runtime.config()
        for incoming in payload.get("lines", []):
            if incoming.get("camera", {}).get("rtsp_url") == "***configured***":
                stored = next(line for line in existing["lines"] if int(line["line_no"]) == int(incoming["line_no"]))
                incoming["camera"]["rtsp_url"] = stored["camera"]["rtsp_url"]
        saved = classification_config_store.save(payload)
        classification_runtime.reload_config(saved)
        return jsonify({"success": True, "data": _public_config(saved)})
    except (ValueError, KeyError, StopIteration) as error:
        return jsonify({"success": False, "message": str(error)}), 400
