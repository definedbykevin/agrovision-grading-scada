# Spesifikasi Alur Kerja AI Security & Sinkronisasi CCTV (AGROVISION)

Dokumen ini berisi spesifikasi teknis lengkap mengenai **Alur Kerja Sinkronisasi Kamera CCTV**, **Relasi Database**, dan **Pipeline Deteksi Logsheet AI** pada stasiun Security proyek **AGROVISION**.

---

## 📐 1. ALUR KERJA SINKRONISASI CCTV (CRUD PIPELINE)

```
[ FRONTEND UI ] ──> [ EXPRESS BACKEND (:3101) ] ──> [ PYTHON AI BACKEND (:4101) ]
CamConfigView.jsx   cctvRoutes.js                   config_routes.py
                    db: agrovision_security              db: agrovision_security_ai
```

### A. Alur Penambahan / Pengubahan Kamera (CREATE / UPDATE)
1. User menginput/mengubah data kamera CCTV pada UI (`camera_name`, `location`, `station_slug`, `rtsp_url`).
2. Express Backend (`cctvRoutes.js`) menyimpan data ke tabel `agrovision_security.cctv_cameras`.
3. Fungsi `syncToAiBackend(cameraData)` secara transparan mengirimkan request HTTP POST/PUT ke Flask AI Port 4101 (`/api/security-ai/config/cameras`).
4. Flask AI menyimpan konfigurasi ke tabel `agrovision_security_ai.security_ai_cctv_configs` dengan format `camera_code = 'CAM_' + id` (misal `CAM_101`).

### B. Alur Penghapusan Kamera (DELETE)
1. User menghapus kamera pada UI.
2. Express Backend menghapus baris di `agrovision_security.cctv_cameras`.
3. Fungsi `syncDeleteToAiBackend(cameraId)` mengirimkan request HTTP DELETE ke Flask AI Port 4101 (`/api/security-ai/config/cameras/CAM_<id>`).
4. Flask AI menghapus konfigurasi kamera terkait dari `agrovision_security_ai.security_ai_cctv_configs`.

---

## 🔗 2. PATOKAN RELASI `camera_code` & DATABASE LOGSHEET

Kolom `camera_code` (misal: `CAM_101`, `CAM_102`, `CAM_111`) adalah **Primary Key & Foreign Key utama** yang menghubungkan physical stream CCTV dengan logika komputasi AI Vision:

```
[ security_ai_cctv_configs ]
           │ (camera_code)
           ▼
[ security_ai_detection_logs ]  <─── (Master Central Logsheet AI)
           │ (id / category)
           ▼
┌──────────┴──────────┬─────────────────┬────────────────┬──────────────────────┐
▼                     ▼                 ▼                ▼                      ▼
security_ai_apd_logs  security_ai_fire_logs security_ai_human_logs security_ai_lpr_logs security_ai_oildispatch_logs
```

---

## 🗄️ 3. SKEMA TABEL & STRUKTUR DATA

### A. Tabel Master Konfigurasi (`agrovision_security_ai.security_ai_cctv_configs`)
| Nama Kolom | Tipe Data | Deskripsi |
| --- | --- | --- |
| `id` | INT (PK, AUTO_INCREMENT) | ID Konfigurasi |
| `camera_code` | VARCHAR(50) (UNIQUE) | Key Unik AI (misal `CAM_101`) |
| `camera_name` | VARCHAR(100) | Nama tampilan kamera |
| `station_slug` | VARCHAR(50) | Slug stasiun pemilik (`security`, `oil-clarification`, dll.) |
| `rtsp_url` | VARCHAR(255) | Link stream mentah RTSP |
| `is_active` | TINYINT(1) | Status aktif kamera |

### B. Tabel Log Master (`agrovision_security_ai.security_ai_detection_logs`)
| Nama Kolom | Tipe Data | Aturan / Deskripsi |
| --- | --- | --- |
| `id` | BIGINT (PK, AUTO_INCREMENT) | ID Log Deteksi |
| `category` | VARCHAR(50) | `APD`, `FIRE`, `HUMAN`, `LPR`, `OILDISPATCH` |
| `camera_code` | VARCHAR(50) (FK) | Kode kamera pembuat log |
| `station_slug` | VARCHAR(50) | Slug stasiun penampung log |
| `plate_no` | VARCHAR(50) | **Hanya terisi jika `station_slug = 'weighbridge'` dan `category = 'LPR'`. NULL untuk stasiun lain.** |
| `detection_detail`| VARCHAR(255) | Deskripsi rinci temuan AI |
| `snapshot_path` | VARCHAR(255) | Path file snapshot foto bukti (`/snapshots/apd_101.jpg`) |
| `detected_at` | DATETIME | Timestamp waktu deteksi |

### C. Tabel Log Spesifik Fitur (Relasi Fitur Category)
1. **`security_ai_apd_logs`**: Menyimpan detail pelanggaran APD (Helm, Vest, Sepatu, Kacamata, Sarung Tangan).
2. **`security_ai_fire_logs`**: Menyimpan detail peringatan Api, Asap, dan Suhu Tinggi.
3. **`security_ai_human_logs`**: Menyimpan detail penyusupan personil di area terlarang (*Intrusion*).
4. **`security_ai_lpr_logs`**: Menyimpan detail pembacaan Plat Nomor Kendaraan di Jembatan Timbang.
5. **`security_ai_oildispatch_logs`**: Menyimpan detail pengisian CPO Tanker (Khusus `oil-clarification`).

---

## 🖥️ 4. PENYAJIAN DI FRONTEND LOGSHEET HUB

1. User memilih Tab Stasiun (misal *Security*, *Weighbridge*, *Oil Clarification Room*).
2. Component [SecurityLogsheetHub.jsx](file:///d:/PREMIER/AgroVision/AGROVISION-NEW-VERSION/AGROVISION/stations/security/frontend/logsheet/SecurityLogsheetHub.jsx) merender komponen logsheet stasiun sesuai `station_slug`.
3. REST API `/api/security/logsheet/event-logs?stationSlug=<slug>&category=<cat>` mengambil data dari `security_ai_detection_logs`.
4. Tabel menampilkan daftar log deteksi real-time beserta foto bukti snapshot saat tombol 📷 diklik.
