try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    psycopg2 = None
    RealDictCursor = None

from config.settings import Config

def get_db_ai_connection():
    """
    Koneksi DB khusus AI (agrovision_security_ai) di PostgreSQL
    """
    if not psycopg2:
        raise RuntimeError("psycopg2 is not installed. Please run 'pip install psycopg2-binary'")
    
    conn = psycopg2.connect(
        host=Config.DB_HOST,
        port=int(Config.DB_PORT),
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        dbname=Config.DB_NAME_AI,
        cursor_factory=RealDictCursor,
        connect_timeout=5
    )
    conn.autocommit = True
    return conn

def get_db_general_connection():
    """
    Koneksi DB SCADA Umum (agrovision_security) di PostgreSQL
    """
    if not psycopg2:
        raise RuntimeError("psycopg2 is not installed. Please run 'pip install psycopg2-binary'")

    conn = psycopg2.connect(
        host=Config.DB_HOST,
        port=int(Config.DB_PORT),
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        dbname=Config.DB_NAME_GENERAL,
        cursor_factory=RealDictCursor,
        connect_timeout=5
    )
    conn.autocommit = True
    return conn

