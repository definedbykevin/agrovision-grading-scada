import os
from dotenv import load_dotenv

# Load variables from .env if present
load_dotenv()

class Config:
    """
    Configuration Parser khusus Modul AI Stasiun Security (Port 4101)
    """
    PORT = int(os.getenv("PORT", 4101))
    FLASK_ENV = os.getenv("FLASK_ENV", "production")
    SECRET_KEY = os.getenv("SECRET_KEY", "agrovision_security_ai_secret_key_2026")
    
    # 🗄️ Database AI & General (PostgreSQL)
    DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
    DB_PORT = int(os.getenv("DB_PORT", 5432))
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "password123")
    DB_NAME_AI = os.getenv("DB_NAME_AI", "agrovision_security_ai")
    DB_NAME_GENERAL = os.getenv("DB_NAME_GENERAL", "agrovision_security")
    
    # ⚡ Redis Pub/Sub Configuration
    REDIS_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
    REDIS_CHANNEL_AI_EVENT = "scada:security:ai_event"
    REDIS_CHANNEL_PLC_DATA = "scada:plc:data"
    
    # 📹 Default RTSP Settings
    DEFAULT_RTSP_URL = os.getenv("DEFAULT_RTSP_URL", "rtsp://admin:password@10.0.0.10:554/Streaming/Channels/101")
