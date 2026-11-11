# ═══════════════════════════════════════════════════════════════════════
# FLASK BACKEND ENTRY POINT: SECURITY STATION AI MICROSERVICE (:4101)
# ═══════════════════════════════════════════════════════════════════════

import os
import logging
from flask import Flask, jsonify
from flask_cors import CORS

from config.settings import Config
from routes.stream_routes import stream_bp
from routes.roi_routes import roi_bp
from routes.analytics_routes import analytics_bp
from routes.config_routes import config_bp
from core.inference_engine import inference_worker
from core.rtsp_streamer import start_cctv_service

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s'
)

def create_app():
    """
    // ISI DISINI UNTUK LOGIC A I U E O: FLASK APP FACTORY FOR STATION SECURITY AI
    """
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Enable CORS untuk mengizinkan permintaan dari Frontend Shell (:5173/:5177) & Node.js (:3101)
    CORS(app)
    
    # 🔌 Register API Blueprints
    app.register_blueprint(stream_bp)
    app.register_blueprint(roi_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(config_bp)
    
    @app.route('/health', methods=['GET'])
    @app.route('/api/health', methods=['GET'])
    @app.route('/api/security-ai/health', methods=['GET'])
    def health_check():
        return jsonify({
            "success": True,
            "message": "API is reachable",
            "server": "Python Flask",
            "service": "security-ai-service",
            "port": Config.PORT
        })
        
    # Start AI Background Worker Thread
    inference_worker.start()
    start_cctv_service()
    
    return app

app = create_app()

if __name__ == '__main__':
    logging.info(f"🚀 Starting Security AI Flask Server on port {Config.PORT}...")
    # A reloader would create a second set of permanent RTSP readers.
    app.run(host='0.0.0.0', port=Config.PORT, debug=(Config.FLASK_ENV == 'development'), use_reloader=False)
