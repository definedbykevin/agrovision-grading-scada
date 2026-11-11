# DOKUMENTASI LENGKAP ARSITEKTUR & PENERAPAN AI STASIUN SECURITY
## AGROVISION — Industrial SCADA v2.0.0 (`stations/security/ai/`)

Dokumen ini menyajikan panduan komprehensif mengenai struktur arsitektur, penjelasan fungsi per-komponen, alur data (*dataflow*), serta cara penerapan dan pengoperasian **Security Station AI Microservice**.

---

## 1. PENJELASAN KOMPONEN DAN BAGIAN-BAGIANNYA

Seluruh modul AI Stasiun Security terisolasi secara mandiri pada lokasi:
`stations/security/ai/`

### 🗂️ A. Struktur Pohon Direktori Utama

```text
stations/security/ai/
├── database/
│   └── schema_ai.sql                 # 🗄️ DDL database khusus `agrovision_security_ai`
│
└── backend/
    ├── app.py                        # 🚀 Entry point Flask App Factory & server HTTP (:4101)
    ├── wsgi.py                       # ⚙️ WSGI Runner untuk deployment PM2 / Gunicorn
    ├── requirements.txt              # 📜 Daftar dependensi library Python
    ├── .env.example                  # 🛠️ Template variabel lingkungan (PORT, DB, Redis)
    │
    ├── config/                       # ⚙️ Konfigurasi Environment & DB Connection Pool
    │   ├── settings.py               #    -> Parser file `.env` & variabel alokasi port
    │   └── database.py               #    -> Pengelola koneksi PyMySQL ke DB `agrovision_security_ai`
    │
    ├── stations_features/            # 📹 7 AREA KAMERA STASIUN x 5 FITUR DETECTOR (35 DETECTORS)
    │   ├── boiler_house/             #    -> Kamera Area Boiler House (apd, fire, human, lpr, oildispatch)
    │   ├── engine_room/              #    -> Kamera Area Engine Room (apd, fire, human, lpr, oildispatch)
    │   ├── kernel_plant/             #    -> Kamera Area Kernel Plant (apd, fire, human, lpr, oildispatch)
    │   ├── press/                    #    -> Kamera Area Press Station (apd, fire, human, lpr, oildispatch)
    │   ├── security/                 #    -> Kamera Area Pos Security Utama (apd, fire, human, lpr, oildispatch)
    │   ├── sterilizer/               #    -> Kamera Area Sterilizer Station (apd, fire, human, lpr, oildispatch)
    │   └── threshing/                #    -> Kamera Area Threshing Station (apd, fire, human, lpr, oildispatch)
    │
    ├── core/                         # 🧠 ENGINE UTAMA CORE AI & STREAMING
    │   ├── rtsp_streamer.py          #    -> Converter Kamera RTSP Hikvision ke HTTP Stream API
    │   ├── roi_processor.py          #    -> Pemroses koordinat Region of Interest (ROI) dari UI
    │   ├── inference_engine.py       #    -> Background Worker Thread pelaksana ML/YOLO
    │   └── redis_publisher.py        #    -> Publisher event realtime ke Redis (`kip:security:ai_event`)
    │
    ├── routes/                       # 🔌 REST API ENDPOINT HANDLERS
    │   ├── stream_routes.py          #    -> Endpoint Stream MJPEG (`/api/security-ai/stream`) & Snapshot
    │   ├── roi_routes.py             #    -> Endpoint CRUD Koordinat ROI (`/api/security-ai/roi`)
    │   ├── analytics_routes.py       #    -> Endpoint Log Telemetri 5 Fitur & Rekomendasi DSS
    │   └── config_routes.py          #    -> Endpoint Konfigurasi Link RTSP Kamera
    │
    └── models/                       # 📦 Folder penyimpanan file bobot model (.pt, .onnx)
        └── README.md
```

---

### 📘 B. Penjelasan Fungsi File & Folder

#### 1. Database Khusus AI (`database/schema_ai.sql`)
- Menampung database terisolasi **`agrovision_security_ai`**.
- Menyimpan tabel konfigurasi kamera RTSP (`security_ai_cctv_configs`), koordinat ROI (`security_ai_roi_configs`), log deteksi 5 fitur (`security_ai_apd_logs`, `security_ai_fire_logs`, `security_ai_human_logs`, `security_ai_lpr_logs`, `security_ai_oildispatch_logs`), serta saran rekomendasi AI (`security_ai_recommendations`).

#### 2. Backend Config (`config/`)
- `settings.py`: Memuat konstanta alokasi port (Port `4101`), kredensial DB, URL Redis, dan channel Pub/Sub.
- `database.py`: Fungsi pembuka koneksi PyMySQL ke DB AI (`agrovision_security_ai`) serta DB SCADA Umum (`agrovision_security`).

#### 3. Logika Per-Kamera Stasiun & Fitur AI (`stations_features/`)
Folder `stations_features/` membagi logika berdasarkan lokasi kamera stasiun (matching slug stasiun):
- Terdapat 7 folder stasiun: `boiler_house`, `engine_room`, `kernel_plant`, `press`, `security`, `sterilizer`, dan `threshing`.
- Di dalam **setiap** folder stasiun kamera di atas, terdapat **5 modul fitur AI Vision**:
  1. `apd/` (`apd_detector.py`): Deteksi kepatuhan APD (Helm Proyek & Rompi Safety).
  2. `fire/` (`fire_detector.py`): Deteksi titik api (*fire*) dan kepulan asap (*smoke*).
  3. `human/` (`human_detector.py`): Deteksi *trespasser* / manusia yang memasuki area berbahaya.
  4. `lpr/` (`lpr_detector.py`): *License Plate Recognition* (OCR pembacaan plat nomor truk).
  5. `oildispatch/` (`oildispatch_detector.py`): Monitoring & pengawasan proses pengisian CPO ke truk tangki.

#### 4. Shared Core Engine (`core/`)
- `rtsp_streamer.py`: Menghubungkan OpenCV ke link RTSP mentah kamera CCTV Hikvision dan menyajikan HTTP MJPEG Stream API.
- `roi_processor.py`: Mengolah pemotongan frame (*cropping*) dan validasi poligon koordinat ROI.
- `inference_engine.py`: Thread worker latar belakang (*non-blocking*) pelaksana deteksi AI kontinu.
- `redis_publisher.py`: Mengirimkan payload JSON hasil deteksi ke Redis Pub/Sub channel `kip:security:ai_event`.

#### 5. REST API Routes (`routes/`)
- `stream_routes.py`: Endpoint `GET /api/security-ai/stream` & `GET /api/security-ai/snapshot`.
- `roi_routes.py`: Endpoint `GET/POST /api/security-ai/roi`.
- `analytics_routes.py`: Endpoint `GET /api/security-ai/analytics/<fitur>` & `GET /api/security-ai/recommendations`.
- `config_routes.py`: Endpoint `GET/POST /api/security-ai/config/cameras`.

---

## 2. FLOW PENGERJAAN & ALUR DATA (DATAFLOW)

Arsitektur dataflow berjalan secara **real-time, asynchronous, dan non-blocking**:

```text
  ┌────────────────────────┐
  │ Kamera IP/CCTV RTSP    │ (rtsp://admin:pass@10.0.0.10:554/...)
  └───────────┬────────────┘
              │
              ▼
  ┌────────────────────────┐      ┌────────────────────────┐
  │ Flask AI Stream Engine │ ────►│ Database AI            │
  │ (core/rtsp_streamer.py)│      │ (agrovision_security_ai)│
  └───────────┬────────────┘      └────────────────────────┘
              │
              ├───────────────────────────────────┐
              ▼ (MJPEG HTTP Stream)               ▼ (Telemetry JSON Event)
  ┌────────────────────────┐          ┌────────────────────────┐
  │ Tab CCTV Feed UI       │          │ Redis Pub/Sub          │
  │ (CctvFeedTab.jsx)      │          │ (kip:security:ai_event)│
  └────────────────────────┘          └───────────┬────────────┘
                                                  │
                                                  ▼ (WebSocket Broadcast)
                                      ┌────────────────────────┐
                                      │ Frontend SCADA UI      │
                                      │ (Realtime Alert & DSS) │
                                      └────────────────────────┘
```

### 💬 Tahapan Alur Kerja Data:

1. **Input Link RTSP**: Link RTSP kamera diinput dari UI dan disimpan di database `agrovision_security_ai.security_ai_cctv_configs`.
2. **Inference & Stream Conversion**:
   - `core/rtsp_streamer.py` menangkap stream RTSP.
   - Frame di-crop sesuai koordinat ROI (`core/roi_processor.py`).
   - Detector per-fitur di `stations_features/<area>/<fitur>/` mengeksekusi model AI.
   - Frame yang digambar *Bounding Box* dikonversi menjadi HTTP MJPEG Stream pada endpoint `GET /api/security-ai/stream`.
3. **Penyajian di UI SCADA**:
   - Tab UI React (`CctvFeedTab.jsx`) merender stream dengan tag `<img src="/api/security-ai/stream?camera_code=CAM_SECURITY_01" />`.
4. **Realtime Broadcast**:
   - Jika terdeteksi kejadian (misal pelanggaran APD / api / LPR), `redis_publisher.py` mengirim payload ke Redis `kip:security:ai_event`.
   - Realtime service menyiarkan event via WebSocket sehingga banner alert di UI menyala seketika (*zero refresh*).
5. **Persistensi Data**: Log hasil deteksi disimpan di tabel telemetri DB `agrovision_security_ai`.

---

## 3. CARA PENERAPAHAN & CARA JALANNYA SISTEM

### 🛠️ Step 1: Impor Database Schema AI
Jalankan script impor PowerShell dari root proyek:
```powershell
.\import-all.ps1
```
> Script ini otomatis menemukan file `stations/security/ai/database/schema_ai.sql` dan mengimpor DB `agrovision_security_ai` ke MySQL (Laragon / Standalone).

---

### ⚙️ Step 2: Konfigurasi File Environment
Pastikan file `.env` pada folder `stations/security/ai/backend/` terisi:
```ini
PORT=4101
FLASK_ENV=development
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME_AI=agrovision_security_ai
DB_NAME_GENERAL=agrovision_security
REDIS_URL=redis://127.0.0.1:6379/0
```

---

### 🚀 Step 3: Menjalankan Sistem (PM2 Integration)

Proyek ini telah terintegrasi di master `ecosystem.config.cjs`. Cukup jalankan perintah master start:
```powershell
# Menggunakan script runner bawaan proyek:
.\start.ps1

# Atau via PM2 langsung:
pm2 start ecosystem.config.cjs
```

#### Verification Commands:
- Cek status process PM2: `pm2 status`
- Cek log service AI Security: `pm2 logs security-ai-service`
- Cek Health Check Flask AI: `curl http://localhost:4101/health`

---

## 4. RANGKUMAN FITUR AI STASIUN SECURITY

| Area Kamera | Fitur AI | File Detector | Fungsi Utama |
|---|---|---|---|
| `boiler_house` | `apd`, `fire`, `human`, `lpr`, `oildispatch` | `*detector.py` | Safety APD, Deteksi Api/Asap, Trespasser, LPR & Dispatch |
| `engine_room` | `apd`, `fire`, `human`, `lpr`, `oildispatch` | `*detector.py` | Safety APD, Deteksi Api/Asap, Trespasser, LPR & Dispatch |
| `kernel_plant` | `apd`, `fire`, `human`, `lpr`, `oildispatch` | `*detector.py` | Safety APD, Deteksi Api/Asap, Trespasser, LPR & Dispatch |
| `press` | `apd`, `fire`, `human`, `lpr`, `oildispatch` | `*detector.py` | Safety APD, Deteksi Api/Asap, Trespasser, LPR & Dispatch |
| `security` | `apd`, `fire`, `human`, `lpr`, `oildispatch` | `*detector.py` | Safety APD, Deteksi Api/Asap, Trespasser, LPR & Dispatch |
| `sterilizer` | `apd`, `fire`, `human`, `lpr`, `oildispatch` | `*detector.py` | Safety APD, Deteksi Api/Asap, Trespasser, LPR & Dispatch |
| `threshing` | `apd`, `fire`, `human`, `lpr`, `oildispatch` | `*detector.py` | Safety APD, Deteksi Api/Asap, Trespasser, LPR & Dispatch |

---
*Dokumentasi ini adalah pedoman baku pengoperasian Modul AI Stasiun Security (v2.0.0).*
