import psycopg2
from psycopg2.extras import RealDictCursor
from config.settings import Config
import logging

def get_db_ai_connection():
    """
    Koneksi ke Database Khusus AI: agrovision_sterilizer_ai_ffb (DBeaver)
    """
    try:
        conn = psycopg2.connect(
            host=Config.DB_HOST,
            port=Config.DB_PORT,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            dbname=Config.DB_NAME_AI,
            cursor_factory=RealDictCursor
        )
        conn.autocommit = True
        return conn
    except Exception as e:
        logging.error(f"[DB_AI] Error connecting to PostgreSQL {Config.DB_NAME_AI}: {e}")
        return None

def get_db_general_connection():
    """
    Koneksi Read-Only ke Database Stasiun Sterilizer Umum: agrovision_sterilizer
    """
    try:
        conn = psycopg2.connect(
            host=Config.DB_HOST,
            port=Config.DB_PORT,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            dbname=Config.DB_NAME_GENERAL,
            cursor_factory=RealDictCursor
        )
        conn.autocommit = True
        return conn
    except Exception as e:
        logging.error(f"[DB_GEN] Error connecting to PostgreSQL {Config.DB_NAME_GENERAL}: {e}")
        return None
