import os
# pyrefly: ignore[missing-import]
from dotenv import load_dotenv

load_dotenv()

class Config:
    """
    Konfigurasi Engine AI FFB Sterilizer Station (Port 4105)
    """
    PORT = int(os.getenv("PORT", 4105))
    FLASK_ENV = os.getenv("FLASK_ENV", "production")
    SECRET_KEY = os.getenv("SECRET_KEY", "agrovision_sterilizer_ai_ffb_secret_key_2026")
    
    # 🗄️ PostgreSQL Database
    DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
    DB_PORT = int(os.getenv("DB_PORT", 5432))
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "password123")
    DB_NAME_AI = os.getenv("DB_NAME_AI", "agrovision_sterilizer_ai_ffb")
    DB_NAME_GENERAL = os.getenv("DB_NAME_GENERAL", "agrovision_sterilizer")
    
    # ⚡ Redis Pub/Sub
    REDIS_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
    REDIS_CHANNEL_PLC = os.getenv("REDIS_CHANNEL_PLC", "scada:plc:data")
    
    # 📹 Fallback RTSP
    DEFAULT_RTSP_URL = os.getenv("DEFAULT_RTSP_URL", "rtsp://admin:password@10.0.0.10:554/profile2/media.smp")
