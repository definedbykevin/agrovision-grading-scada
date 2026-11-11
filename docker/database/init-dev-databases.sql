-- ═══════════════════════════════════════════════════════════════════════
-- AGROVISION SCADA — Dev Database Initializer (PostgreSQL 16)
-- Otomatis dijalankan Docker saat pertama kali container Postgres dibuat
-- ═══════════════════════════════════════════════════════════════════════

-- Database Aktif untuk Stasiun SCADA:
CREATE DATABASE agrovision_grading_ramp;
CREATE DATABASE agrovision_plc;
CREATE DATABASE agrovision_loading_ramp;
CREATE DATABASE agrovision_sterilizer;
CREATE DATABASE agrovision_sterilizer_ai_ffb;
CREATE DATABASE agrovision_threshing;

-- User / Roles yang digunakan oleh service:
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'scada_station_user') THEN
    CREATE ROLE scada_station_user LOGIN PASSWORD 'CHANGE_THIS_PASSWORD';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'scada_snap7') THEN
    CREATE ROLE scada_snap7 LOGIN PASSWORD 'CHANGE_THIS_PASSWORD';
  END IF;
END
$$;
