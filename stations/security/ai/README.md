# MODUL AI STASIUN SECURITY (STATION-LEVEL MICROSERVICE)
## AGROVISION — Industrial SCADA v2.0.0

Dokumen ini menjelaskan struktur, alur kerja, dan endpoints API untuk **Modul AI Stasiun Security**.

---

## 1. STRUKTUR DIREKTORI LOGIKA KAMERA STASIUN (`stations_features/`)

Logika AI dipisah berdasarkan area kamera stasiun (matching station slugs) dan 5 modul fitur:

```text
stations/security/ai/backend/stations_features/
├── boiler_house/              # 🏭 Area Kamera Boiler House (apd, fire, human, lpr, oildispatch)
├── engine_room/               # ⚡ Area Kamera Engine Room (apd, fire, human, lpr, oildispatch)
├── kernel_plant/              # 🌰 Area Kamera Kernel Plant (apd, fire, human, lpr, oildispatch)
├── press/                     # 🚜 Area Kamera Press Station (apd, fire, human, lpr, oildispatch)
├── security/                  # 👮 Area Kamera Pos Security Utama (apd, fire, human, lpr, oildispatch)
├── sterilizer/                # ♨️ Area Kamera Sterilizer Station (apd, fire, human, lpr, oildispatch)
└── threshing/                 # 🌾 Area Kamera Threshing Station (apd, fire, human, lpr, oildispatch)
```

---

## 2. API ENDPOINTS (FLASK PORT 4101)

| Endpoint | Method | Fungsi |
|---|:---:|---|
| `/health` | `GET` | Health check service Flask AI |
| `/api/security-ai/stream` | `GET` | HTTP MJPEG Video Stream untuk Tab CCTV Feed |
| `/api/security-ai/snapshot` | `GET` | Single JPEG Frame Snapshot |
| `/api/security-ai/roi` | `GET/POST` | Mengambil & Menyimpan Koordinat ROI |
| `/api/security-ai/analytics/apd` | `GET` | Log Telemetri APD (Helm & Rompi) |
| `/api/security-ai/analytics/fire` | `GET` | Log Telemetri Deteksi Api & Asap |
| `/api/security-ai/analytics/human` | `GET` | Log Telemetri Deteksi Trespasser / Manusia |
| `/api/security-ai/analytics/lpr` | `GET` | Log Telemetri OCR Plat Nomor Truk |
| `/api/security-ai/analytics/oildispatch` | `GET` | Log Telemetri Pengawasan Pengisian CPO |
| `/api/security-ai/recommendations` | `GET` | Saran Rekomendasi Keputusan AI (DSS) |
| `/api/security-ai/config/cameras` | `GET/POST` | Manajemen Link RTSP Kamera di DB `agrovision_security_ai` |

---

## 3. INTEGRASI DB

- **Database Khusus AI**: `agrovision_security_ai` (dikendalikan via file `database/schema_ai.sql`).
- **Database SCADA Umum**: `agrovision_security` (diakses *Read-Only* jika AI membutuhkan data jadwal/gate).
