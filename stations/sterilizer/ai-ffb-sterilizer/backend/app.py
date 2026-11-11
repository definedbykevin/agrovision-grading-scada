# ═══════════════════════════════════════════════════════════════════════
# FLASK BACKEND ENTRY POINT: STERILIZER FFB AI MICROSERVICE (:4105)
# ═══════════════════════════════════════════════════════════════════════

import os
import logging
# pyrefly: ignore[missing-import]
from flask import Flask, jsonify
from flask_cors import CORS

from config.settings import Config
from routes.stream_routes import stream_bp
from routes.camera_routes import camera_bp
from routes.stats_routes import stats_bp
from routes.cycle_routes import cycle_bp
from core.camera_streamer import get_streamer

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s'
)

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Izinkan CORS dari frontend shell (:5173, :5177) dan backend Node.js
    CORS(app)
    
    # 🔌 Register API Blueprints
    app.register_blueprint(stream_bp)
    app.register_blueprint(camera_bp)
    app.register_blueprint(stats_bp)
    app.register_blueprint(cycle_bp)
    
    @app.route('/health', methods=['GET'])
    @app.route('/api/health', methods=['GET'])
    @app.route('/api/sterilizer-ai/health', methods=['GET'])
    def health_check():
        cameras_status = {}
        for line_no in [1, 2, 3, 4]:
            streamer = get_streamer(line_no)
            cameras_status[str(line_no)] = {
                "connected": streamer.is_connected,
                "camera_code": streamer.camera_code
            }
        return jsonify({
            "success": True,
            "message": "Sterilizer AI FFB Service is online",
            "server": "Python Flask",
            "service": "sterilizer-ai-ffb-service",
            "port": Config.PORT,
            "cameras": cameras_status
        })

    # Inisialisasi background streamer untuk Line 1 s/d 4
    for line_idx in [1, 2, 3, 4]:
        get_streamer(line_idx)
    
    return app

app = create_app()

if __name__ == '__main__':
    logging.info(f"🚀 Starting Sterilizer AI FFB Flask Server on port {Config.PORT}...")
    app.run(host='0.0.0.0', port=Config.PORT, debug=(Config.FLASK_ENV == 'development'))
