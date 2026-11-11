# Cetak Biru & Checklist Kebutuhan Lengkap Modul AI Security Logsheet

Dokumen ini adalah **Checklist Syarat & Spesifikasi Kebutuhan Sistem 360-Derajat** agar direktori frontend [stations/security/frontend/logsheet](file:///d:/PREMIER/AgroVision/AGROVISION-NEW-VERSION/AGROVISION/stations/security/frontend/logsheet) dapat berjalan 100% normal, stabil, dan tanpa error.

---

## 📊 1. PERSYARATAN TABEL DATABASE & KOLOM (MySQL)

Agar modul logsheet dapat membaca, memfilter, dan menampilkan data log, 3 database MySQL harus memiliki tabel dan kolom berikut:

### A. Database `agrovision_config` (Pusat Registri)
* **File Schema:** `main-service/database/schema.sql`
* **Tabel:** `station_registry`
* **Kolom Wajib:**
  * `slug` (VARCHAR 50, PK): Slug stasiun (`security`, `weighbridge`, `oil-clarification`, `sterilizer`, dll.).
  * `title` (VARCHAR 100): Nama menu tampilan (misal: *Oil Clarification Room*).
  * `is_active` (TINYINT 1): Harus bernilai `1` agar stasiun muncul di tab bar logsheet.
  * `sort_order` (INT): Urutan menu navigasi.

### B. Database `agrovision_security` (Master Kamera)
* **File Schema:** `stations/security/database/schema.sql`
* **Tabel:** `cctv_cameras`
* **Kolom Wajib:**
  * `id` (INT, PK, AUTO_INCREMENT)
  * `camera_name` (VARCHAR 100)
  * `station_slug` (VARCHAR 50): Pemilik stasiun kamera (DEFAULT `'security'`).
  * `rtsp_url` (VARCHAR 255)
  * `is_active` (TINYINT 1)

### C. Database `agrovision_security_ai` (Master Logsheet AI)
* **File Schema:** `stations/security/ai/database/schema_ai.sql`
* **Tabel Master:** `security_ai_detection_logs`
* **Kolom Wajib & Aturan Data:**
  * `id` (BIGINT, PK, AUTO_INCREMENT)
  * `category` (VARCHAR 50): Wajib berisi salah satu dari `'APD'`, `'FIRE'`, `'HUMAN'`, `'LPR'`, atau `'OILDISPATCH'`.
  * `camera_code` (VARCHAR 50, FK): Kode kamera (misal `CAM_101`).
  * `camera_name` (VARCHAR 100): Nama deskripsi kamera.
  * `station_slug` (VARCHAR 50): Slug stasiun penerima log (`security`, `oil-clarification`, dll.).
  * `plate_no` (VARCHAR 50): **Hanya terisi jika `station_slug = 'weighbridge'` dan `category = 'LPR'`. Bernilai NULL untuk stasiun lain.**
  * `detection_detail` (VARCHAR 255): Teks rincian temuan deteksi.
  * `snapshot_path` (VARCHAR 255): Path file snapshot foto bukti (misal `/snapshots/apd_101.jpg`).
  * `detected_at` (DATETIME): Timestamp waktu deteksi.

---

## 🐍 2. PERSYARATAN SERVER PYTHON AI MICROSERVICE (Port 4101)

* **Lokasi:** `stations/security/ai/backend/`
* **File Server Utama:** `app.py` (Menjalankan server Flask port `4101`).
* **File Route Analytics:** [analytics_routes.py](file:///d:/PREMIER/AgroVision/AGROVISION-NEW-VERSION/AGROVISION/stations/security/ai/backend/routes/analytics_routes.py)
* **Kebutuhan Logika Program:**
  * Route: `@analytics_bp.route('/detection-logs', methods=['GET'])`
  * Menerima query string: `station_slug`, `category`, `start_date`, `end_date`, `page`, `limit`.
  * Menjalankan kueri SQL dengan normalisasi slug dan filter kategori:
    ```sql
    WHERE REPLACE(station_slug, '_', '-') = REPLACE(%s, '_', '-')
      AND category = %s
      AND detected_at >= %s
      AND detected_at <= %s
    ORDER BY detected_at DESC, id DESC LIMIT %s OFFSET %s
    ```

---

## ⚡ 3. PERSYARATAN SERVER EXPRESS NODE.JS BACKEND (Port 3101)

* **Lokasi:** `stations/security/backend/`
* **File Server Utama:** `src/server.js` (Menjalankan Express server port `3101`).
* **Registrasi Route Wajib di `server.js`:**
  ```javascript
  import logsheetRoutes from './routes/logsheetRoutes.js';
  app.use('/api/security/logsheet', logsheetRoutes);
  ```
* **File Route Handler:** [logsheetRoutes.js](file:///d:/PREMIER/AgroVision/AGROVISION-NEW-VERSION/AGROVISION/stations/security/backend/src/routes/logsheetRoutes.js)
* **Kebutuhan Logika Program:**
  * Endpoint GET `/api/security/logsheet/event-logs` mem-proxy HTTP request ke Python AI Port 4101.
  * Meneruskan query parameter: `stationSlug`, `category`, `startDate`, `endDate`, `page`, `limit`.
  * Mengubah `snapshot_path` menjadi URL absolut `image_url` -> `http://localhost:4101/snapshots/...`.

---

## 🌐 4. PERSYARATAN PROCESS MANAGER & NETWORK PROXY

* **PM2 Config (`ecosystem.config.cjs`):**
  * Wajib ada service `security-station` (`cwd: ./stations/security/backend`, port 3101).
  * Wajib ada service `security-ai-service` (`cwd: ./stations/security/ai/backend`, port 4101).
* **Vite Proxy (`main-service/frontend/vite.config.js`):**
  * Meneruskan `/api/security` ke `http://localhost:3101`.
* **Nginx Proxy (`gateway/nginx.conf`):**
  * Meneruskan `/api/security/` ke upstream `127.0.0.1:3101`.

---

## 💻 5. PERSYARATAN STRUKTUR KOMPONEN FRONTEND & CSS

* **Lokasi Root:** `stations/security/frontend/logsheet/`
* **File Hub Utama:**
  * `SecurityLogsheetHub.jsx` (Memanggil `/api/config/stations` untuk menyusun tab bar).
  * `SecurityLogsheetHub.css` (Style tab pill & wrapper layout).
* **17 Subfolder Komponen Stasiun (Wajib Memiliki Pasangan JSX & CSS):**

| Nama Folder | File JSX | File CSS | Prefix CSS Wajib |
| --- | --- | --- | --- |
| `all-stations/` | `AllStationsLogsheet.jsx` | `AllStationsLogsheet.css` | `all-stations-*` |
| `security/` | `SecurityLogsheet.jsx` | `SecurityLogsheet.css` | `security-*` |
| `weighbridge/` | `WeighbridgeLogsheet.jsx` | `WeighbridgeLogsheet.css` | `weighbridge-*` |
| `grading-ramp/` | `GradingRampLogsheet.jsx` | `GradingRampLogsheet.css` | `grading-*` |
| `loading-ramp/` | `LoadingRampLogsheet.jsx` | `LoadingRampLogsheet.css` | `loading-*` |
| `sterilizer/` | `SterilizerLogsheet.jsx` | `SterilizerLogsheet.css` | `sterilizer-*` |
| `threshing/` | `ThreshingLogsheet.jsx` | `ThreshingLogsheet.css` | `threshing-*` |
| `efb-plant/` | `EfbPlantLogsheet.jsx` | `EfbPlantLogsheet.css` | `efb-*` |
| `press/` | `PressLogsheet.jsx` | `PressLogsheet.css` | `press-*` |
| `kernel-plant/` | `KernelPlantLogsheet.jsx` | `KernelPlantLogsheet.css` | `kernel-*` |
| `oil-clarification-room/` | `OilClarificationRoomLogsheet.jsx` | `OilClarificationRoomLogsheet.css` | `oil-*` |
| `boiler-house/` | `BoilerHouseLogsheet.jsx` | `BoilerHouseLogsheet.css` | `boiler-*` |
| `engine-room/` | `EngineRoomLogsheet.jsx` | `EngineRoomLogsheet.css` | `engine-*` |
| `raw-water-treatment/` | `RawWaterTreatmentLogsheet.jsx` | `RawWaterTreatmentLogsheet.css` | `water-*` |
| `daf-osr/` | `DafOsrLogsheet.jsx` | `DafOsrLogsheet.css` | `daf-*` |
| `cmrs/` | `CmrsLogsheet.jsx` | `CmrsLogsheet.css` | `cmrs-*` |
| `effluent-treatment/` | `EffluentTreatmentLogsheet.jsx` | `EffluentTreatmentLogsheet.css` | `effluent-*` |

### Logika Internal Setiap Komponen Logsheet (`*Logsheet.jsx`):
1. **State:** `logs`, `loading`, `page`, `totalPages`, `total`, `date`, `timeSeries`, `category`, `selectedCapture`.
2. **Kalkulasi Rentang Waktu (`calculateDateRange`):** Mendukung `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`.
3. **Socket.IO Listener:** `ai:event` & `station:log` untuk pemicu refresh tabel real-time.
4. **Modal Bukti Snapshot:** Menampilkan preview foto `.jpg` saat icon 📷 diklik.
5. **Ekspor CSV:** Fungsi `handleExport()` untuk mengunduh log sesuai filter aktif.
