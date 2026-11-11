#!/usr/bin/env bash
# ==============================================================================
# AGROVISION - IMPORT ALL DATABASES (PostgreSQL, Ubuntu Linux)
# VERSI 2 — perbaikan atas import-all-pg-fixed.sh:
#   1. File yang tidak ketemu sekarang dihitung sebagai FAIL (bukan SKIP diam-diam)
#   2. Setiap import schema pakai ON_ERROR_STOP=1 (psql berhenti keras kalau ada
#      statement SQL yang gagal, tidak lanjut pura-pura sukses)
#   3. Di akhir, script VERIFIKASI LANGSUNG ke Postgres — hitung jumlah table
#      yang benar-benar ada di tiap database. Laporan "berhasil" sekarang
#      berdasarkan fakta di database, bukan cuma exit code psql.
#
# Usage:
#   chmod +x import-all-pg-fixed-v2.sh
#   ./import-all-pg-fixed-v2.sh
#   ./import-all-pg-fixed-v2.sh <password>
# ==============================================================================

set -u

PG_PASS="${1:-200898}"
PG_USER="postgres"
PG_HOST="localhost"
PG_PORT="5432"

export PGPASSWORD="$PG_PASS"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

FAIL_COUNT=0

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# ------------------------------------------------------------------------
# Helper: jalankan psql, cek exit code, tampilkan error asli kalau gagal.
# Sekarang SELALU pakai ON_ERROR_STOP=1 untuk file/command SQL.
# ------------------------------------------------------------------------
run_psql() {
    local desc="$1"
    shift
    local output
    output="$(psql -v ON_ERROR_STOP=1 -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" "$@" 2>&1)"
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

# ------------------------------------------------------------------------
# Helper: cari file schema di beberapa kandidat path. Print SEMUA path yang
# dicoba (biar kalau tidak ketemu, kamu langsung tau persis di mana harus
# naruh filenya) — dan kalau tidak ketemu sama sekali, itu FAIL, bukan skip.
# ------------------------------------------------------------------------
resolve_schema_file() {
    local desc="$1"
    shift
    local candidate
    for candidate in "$@"; do
        if [ -f "$candidate" ]; then
            echo "$candidate"
            return 0
        fi
    done
    echo -e "${RED}   >>> FILE TIDAK DITEMUKAN [$desc]. Path yang dicoba:${NC}" >&2
    for candidate in "$@"; do
        echo "       - $candidate" >&2
    done
    FAIL_COUNT=$((FAIL_COUNT + 1))
    return 1
}

echo -e "${CYAN}====================================================${NC}"
echo -e "${CYAN}   AGROVISION - IMPORT POSTGRESQL DATABASES (v2)     ${NC}"
echo -e "${CYAN}====================================================${NC}"
echo -e "${YELLOW}Info koneksi: host=$PG_HOST port=$PG_PORT user=$PG_USER${NC}"
echo -e "${YELLOW}Script dijalankan dari: $SCRIPT_DIR${NC}"

# Test koneksi
CONN_TEST="$(psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -c "SELECT version();" 2>&1)"
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Gagal terhubung ke PostgreSQL!${NC}"
    echo "$CONN_TEST" | sed 's/^/   /'
    echo -e "${YELLOW}Cek: sudo systemctl status postgresql${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Koneksi PostgreSQL OK!${NC}\n"

# ------------------------------------------------------------------------
# 1. Buat database
# ------------------------------------------------------------------------
DATABASES=(
    "agrovision_main"
    "agrovision_sterilizer"
    "agrovision_threshing"
    "agrovision_grading_ramp"
    "agrovision_loading_ramp"
)

echo -e "${CYAN}1. Membuat Database...${NC}"
for DB in "${DATABASES[@]}"; do
    EXISTS="$(psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB'" 2>&1)"
    if [ "$EXISTS" = "1" ]; then
        echo -e "   -> Database [$DB] ... ${GREEN}sudah ada, skip${NC}"
        continue
    fi
    echo -n "   -> Database [$DB] ... "
    run_psql "CREATE DATABASE $DB" -c "CREATE DATABASE $DB;"
done

# ------------------------------------------------------------------------
# 2. Import schema utama (agrovision_main)
#    Dicoba di beberapa kandidat lokasi — kalau kamu naruh file di tempat
#    lain, tambahkan path-nya ke daftar kandidat di bawah.
# ------------------------------------------------------------------------
echo -e "\n${CYAN}2. Import Schema agrovision_main...${NC}"
MAIN_SCHEMA="$(resolve_schema_file "agrovision_main schema" \
    "$SCRIPT_DIR/main-service/database/postgres_schema.sql" \
    "$SCRIPT_DIR/agrovision_main_fixed.sql" \
    "$SCRIPT_DIR/database/agrovision_main_fixed.sql" \
)"
if [ -n "$MAIN_SCHEMA" ]; then
    echo -n "   -> $(basename "$MAIN_SCHEMA") ... "
    run_psql "agrovision_main schema" -d agrovision_main -f "$MAIN_SCHEMA"
fi

STATION_REGISTRY="$(resolve_schema_file "station_registry" \
    "$SCRIPT_DIR/main-service/database/station_registry.sql" \
)"
if [ -n "$STATION_REGISTRY" ]; then
    echo -n "   -> $(basename "$STATION_REGISTRY") ... "
    run_psql "station_registry" -d agrovision_main -f "$STATION_REGISTRY"
else
    echo -e "   ${YELLOW}(opsional — dilewati kalau memang belum ada file terpisah untuk ini)${NC}"
fi

# ------------------------------------------------------------------------
# 3. Insert default user accounts
# ------------------------------------------------------------------------
echo -e "\n${CYAN}3. Insert User Accounts Default...${NC}"
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

# ------------------------------------------------------------------------
# 4. Import schema per-station
# ------------------------------------------------------------------------
echo -e "\n${CYAN}4. Import Schema Stasiun Aktif...${NC}"
STATIONS=(
    "sterilizer"
    "threshing"
    "grading-ramp"
    "loading-ramp"
)

for ST in "${STATIONS[@]}"; do
    DB_NAME="agrovision_${ST//-/_}"
    SCHEMA_PATH="$(resolve_schema_file "schema $ST" \
        "$SCRIPT_DIR/stations/$ST/database/postgres_schema.sql" \
    )"
    if [ -n "$SCHEMA_PATH" ]; then
        echo -n "   -> Station [$ST] ($DB_NAME) schema ... "
        run_psql "schema $ST" -d "$DB_NAME" -f "$SCHEMA_PATH"

        echo -n "   -> Station [$ST] ($DB_NAME) station_tag_mappings ... "
        run_psql "station_tag_mappings $ST" -d "$DB_NAME" -c "CREATE TABLE IF NOT EXISTS station_tag_mappings (id SERIAL PRIMARY KEY, station VARCHAR(50) NOT NULL, equipment VARCHAR(100) NOT NULL, signal_key VARCHAR(50) NOT NULL, tag_id INT NOT NULL, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);"
    fi
done

# ------------------------------------------------------------------------
# 5. VERIFIKASI NYATA — hitung table asli di tiap database.
#    Ini bagian paling penting: laporan akhir sekarang jujur berdasarkan
#    apa yang benar-benar ada di Postgres, bukan cuma "exit code = 0".
# ------------------------------------------------------------------------
echo -e "\n${CYAN}5. Verifikasi Isi Database (jumlah table nyata)...${NC}"
for DB in "${DATABASES[@]}"; do
    COUNT="$(psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$DB" -tAc \
        "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null)"
    if [ -z "$COUNT" ] || [ "$COUNT" = "0" ]; then
        echo -e "   -> [$DB] ${RED}0 table (KOSONG!)${NC}"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    else
        echo -e "   -> [$DB] ${GREEN}$COUNT table${NC}"
    fi
done

echo ""
if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}====================================================${NC}"
    echo -e "${GREEN}   SELESAI — SEMUA VERIFIED BERHASIL!               ${NC}"
    echo -e "${GREEN}====================================================${NC}"
else
    echo -e "${RED}====================================================${NC}"
    echo -e "${RED}   SELESAI DENGAN $FAIL_COUNT MASALAH! Cek log di atas.${NC}"
    echo -e "${RED}====================================================${NC}"
fi

exit $FAIL_COUNT
