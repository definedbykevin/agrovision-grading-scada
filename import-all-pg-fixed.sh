#!/usr/bin/env bash
# ==============================================================================
# AGROVISION / AgroVision - AUTO IMPORT ALL DATABASES (POSTGRESQL 16/18 - LINUX UBUNTU)
# VERSI PERBAIKAN: setiap perintah psql sekarang dicek exit code-nya (bukan
# selalu mencetak OK). Kalau gagal, pesan error asli dari PostgreSQL akan
# ditampilkan ke layar supaya mudah didiagnosa.
# ==============================================================================
# Usage:
#   chmod +x import-all-pg-fixed.sh
#   ./import-all-pg-fixed.sh
#   ./import-all-pg-fixed.sh 200898
# ==============================================================================

set -u  # error kalau ada variabel yang belum di-set (bantu deteksi typo)

PG_PASS="${1:-admin123}"
PG_USER="postgres"
PG_HOST="localhost"
PG_PORT="${PG_PORT:-5432}"

export PGPASSWORD="$PG_PASS"

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAIL_COUNT=0

# Helper: jalankan psql, cek exit code, tampilkan error kalau gagal
run_psql() {
    local desc="$1"
    shift
    local output
    output="$(psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" "$@" 2>&1)"
    local status=$?
    if [ $status -eq 0 ]; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${RED}FAIL${NC}"
        echo -e "${RED}   >>> ERROR [$desc]:${NC}"
        echo "$output" | sed 's/^/       /'
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
}

echo -e "${CYAN}====================================================${NC}"
echo -e "${CYAN}   AgroVision AGROVISION - IMPORT POSTGRESQL DATABASES   ${NC}"
echo -e "${CYAN}   Target: Linux Ubuntu v22 / v26 - PostgreSQL 16/18   ${NC}"
echo -e "${CYAN}====================================================${NC}"

echo -e "${YELLOW}Info koneksi: host=$PG_HOST port=$PG_PORT user=$PG_USER${NC}"

# Test PostgreSQL Connection (sekarang menampilkan error asli kalau gagal)
CONN_TEST="$(psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -c "SELECT version();" 2>&1)"
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Gagal terhubung ke PostgreSQL!${NC}"
    echo -e "${RED}Pesan asli dari psql:${NC}"
    echo "$CONN_TEST" | sed 's/^/   /'
    echo -e "${YELLOW}Pastikan service postgresql berjalan: sudo systemctl status postgresql${NC}"
    echo -e "${YELLOW}Dan password postgres benar. Usage: ./import-all-pg-fixed.sh <password>${NC}"
    echo -e "${YELLOW}Jika ada lebih dari satu cluster PostgreSQL, cek: pg_lsclusters${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Koneksi PostgreSQL OK!${NC}"
echo -e "${CYAN}   Detail server:${NC}"
echo "$CONN_TEST" | sed 's/^/   /'
echo ""

# 1. Main database & Active Station Databases ONLY
DATABASES=(
    "agrovision_main"
    "agrovision_sterilizer"
    "agrovision_threshing"
    "agrovision_grading_ramp"
    "agrovision_loading_ramp"
)

echo -e "${CYAN}1. Membuat Database Engine (Main & Stasiun Aktif)...${NC}"
for DB in "${DATABASES[@]}"; do
    EXISTS="$(psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB'" 2>&1)"
    if [ "$EXISTS" = "1" ]; then
        echo -e "   -> Database [$DB] ... ${GREEN}sudah ada, skip${NC}"
        continue
    fi
    echo -n "   -> Database [$DB] ... "
    run_psql "CREATE DATABASE $DB" -c "CREATE DATABASE $DB;"
done

echo -e "\n${CYAN}2. Meng-import Skema & Data Konsolidasi (agrovision_main)...${NC}"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [ -f "$SCRIPT_DIR/main-service/database/postgres_schema.sql" ]; then
    echo -n "   -> main-service postgres_schema.sql ... "
    run_psql "postgres_schema.sql" -d agrovision_main -f "$SCRIPT_DIR/main-service/database/postgres_schema.sql"
else
    echo -e "   ${YELLOW}[SKIP] File tidak ditemukan: $SCRIPT_DIR/main-service/database/postgres_schema.sql${NC}"
fi

if [ -f "$SCRIPT_DIR/main-service/database/station_registry.sql" ]; then
    echo -n "   -> station_registry.sql & system_settings ... "
    run_psql "station_registry.sql" -d agrovision_main -f "$SCRIPT_DIR/main-service/database/station_registry.sql"
else
    echo -e "   ${YELLOW}[SKIP] File tidak ditemukan: $SCRIPT_DIR/main-service/database/station_registry.sql${NC}"
fi

echo -e "\n${CYAN}3. Memasukkan User Accounts Asli (dev, admin, premier, operator, supervisor)...${NC}"
echo -n "   -> Insert users ... "
run_psql "insert users" -d agrovision_main -c "
INSERT INTO users (id, username, password_hash, position_title, company_name, role) VALUES 
(1, 'admin',      '\$2b\$10\$BLM6uZnzH0psRexSiyelZOCFwmF8CqIOL.jjPCF005aJtZ1qM18De', 'System Administrator',     'AgroVision Internal',                  'ADMIN'),
(2, 'premier',    '\$2b\$10\$BLM6uZnzH0psRexSiyelZOCFwmF8CqIOL.jjPCF005aJtZ1qM18De', 'Premier Engineering',       'PT Premier Engineering Indonesia', 'ADMIN'),
(3, 'operator',   '\$2b\$10\$BLM6uZnzH0psRexSiyelZOCFwmF8CqIOL.jjPCF005aJtZ1qM18De', 'Station Operator',          'Smart Oil Mill',                   'OPERATOR'),
(4, 'supervisor', '\$2b\$10\$BLM6uZnzH0psRexSiyelZOCFwmF8CqIOL.jjPCF005aJtZ1qM18De', 'Shift Supervisor',          'Smart Oil Mill',                   'SUPERVISOR'),
(5, 'dev',        '\$2b\$10\$iUSaADHtEwjO.OIvXbUWZOz2xYZJ64DLysjHQVRHAFzECqmez.C0i', 'Lead Developer',            'PT Premier Engineering Indonesia', 'DEVELOPER')
ON CONFLICT (username) DO NOTHING;
"

echo -e "\n${CYAN}4. Meng-import Skema Stasiun Aktif Pilihan...${NC}"
STATIONS=(
    "sterilizer"
    "threshing"
    "grading-ramp"
    "loading-ramp"
)

for ST in "${STATIONS[@]}"; do
    DB_NAME="agrovision_${ST//-/_}"
    SCHEMA_PATH="$SCRIPT_DIR/stations/$ST/database/postgres_schema.sql"

    # Fallback ke schema sterilizer jika file khusus stasiun belum ada
    if [ ! -f "$SCHEMA_PATH" ]; then
        SCHEMA_PATH="$SCRIPT_DIR/stations/sterilizer/database/postgres_schema.sql"
    fi

    if [ -f "$SCHEMA_PATH" ]; then
        echo -n "   -> Station [$ST] ($DB_NAME) schema ... "
        run_psql "schema $ST" -d "$DB_NAME" -f "$SCHEMA_PATH"

        echo -n "   -> Station [$ST] ($DB_NAME) station_tag_mappings ... "
        run_psql "station_tag_mappings $ST" -d "$DB_NAME" -c "CREATE TABLE IF NOT EXISTS station_tag_mappings (id SERIAL PRIMARY KEY, station VARCHAR(50) NOT NULL, equipment VARCHAR(100) NOT NULL, signal_key VARCHAR(50) NOT NULL, tag_id INT NOT NULL, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);"
    else
        echo -e "   ${YELLOW}[SKIP] Station [$ST]: file schema tidak ditemukan di $SCHEMA_PATH${NC}"
    fi
done

echo ""
if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}====================================================${NC}"
    echo -e "${GREEN}   SELESAI! SCRIPT IMPORT-ALL BERHASIL DIEKSEKUSI!  ${NC}"
    echo -e "${GREEN}====================================================${NC}"
else
    echo -e "${RED}====================================================${NC}"
    echo -e "${RED}   SELESAI DENGAN $FAIL_COUNT ERROR! Cek log di atas.  ${NC}"
    echo -e "${RED}====================================================${NC}"
fi

echo -e "${YELLOW}Verifikasi manual database yang ada:${NC}"
psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -l 2>&1 | grep -i agrovision || echo -e "${RED}   Tidak ada database 'agrovision_*' ditemukan!${NC}"

exit $FAIL_COUNT
