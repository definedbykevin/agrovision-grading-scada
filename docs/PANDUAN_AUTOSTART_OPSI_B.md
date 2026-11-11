# 📘 PANDUAN LENGKAP: AUTO-START SISTEM AgroVision (OPSI B - DENGAN KEAMANAN LOGIN)
**Dokumentasi Konfigurasi Otomatisasi Startup, Environment Variables, & Autostart Browser pada Ubuntu Linux**

---

## 📑 Daftar Isi
1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Arsitektur 3 Lapisan (Layering) & Cara Kerjanya](#2-arsitektur-3-lapisan-layering--cara-kerjanya)
3. [Keunggulan Arsitektur: Backend Mandiri Tanpa Login](#3-keunggulan-arsitektur-backend-mandiri-tanpa-login)
4. [Perbandingan Model Tampilan Desktop (Opsi 3A vs Opsi 3B)](#4-perbandingan-model-tampilan-desktop-opsi-3a-vs-opsi-3b)
5. [Konsep Environment Variables di Linux Ubuntu](#5-konsep-environment-variables-di-linux-ubuntu)
6. [Panduan Langkah Demi Langkah (Step-by-Step Implementation - Opsi 3B)](#6-panduan-langkah-demi-langkah-step-by-step-implementation---opsi-3b)
7. [Fitur Tambahan: Shortcut Desktop untuk Manual Control](#7-fitur-tambahan-shortcut-desktop-untuk-manual-control)
8. [Perintah Operasional & Troubleshooting](#8-perintah-operasional--troubleshooting)

---

## 1. Ringkasan Eksekutif

Pada lingkungan operasional pabrik kelapa sawit (*Mill / Plant*), operator membutuhkan sistem yang praktis dan tidak rumit, tanpa perlu membuka terminal Linux atau mengetik perintah teknis secara manual setiap kali PC dinyalakan.

**Tujuan Implementasi (Opsi B dengan Standar Keamanan Opsi 3B):**
* **Otomatisasi Penuh di Background:** Begitu tombol **Power CPU** dinyalakan, seluruh sistem inti (Database PostgreSQL, Redis, API Gateway, dan PLC Collector) **langsung hidup dan membaca data PLC secara real-time**, bahkan sebelum operator memasukkan password.
* **Keamanan Terjaga (Opsi 3B):** PC tetap terlindungi dengan login password Ubuntu.
* **Autostart Browser:** Begitu operator mengetik password dan masuk ke desktop, **Google Chrome otomatis langsung terbuka** menuju halaman monitoring AgroVision (`http://localhost:5173`).

---

## 2. Arsitektur 3 Lapisan (Layering) & Cara Kerjanya

Sistem auto-start dibagi menjadi 3 lapisan independen (*decoupled architecture*) untuk memastikan keandalan, keamanan, dan toleransi kegagalan (*fault tolerance*):

```
+-----------------------------------------------------------------------+
|                       PC POWER ON (BOOTING)                           |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|  LAPISAN 1: SYSTEM SERVICES (systemd)                                 |
|  * Status: HIDUP SEBELUM LOGIN (Level Kernel/OS)                      |
|  - PostgreSQL Database Service (Port 5432) -> Otomatis ON            |
|  - Redis Server Cache & Pub/Sub (Port 6379) -> Otomatis ON            |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|  LAPISAN 2: APPLICATION DAEMON (PM2 Enterprise Process Manager)       |
|  * Status: HIDUP SEBELUM LOGIN (Level System Service Daemon)          |
|  - PM2 Service Daemon membaca snapshot konfigurasi (pm2 save)         |
|  - Menjalankan seluruh backend & collector:                           |
|    * Gateway API                                                      |
|    * Main Service                                                     |
|    * Sterilizer Station Backend & snap7 PLC Collector                 |
|    * Station Lainnya (Threshing, Press, Kernel, Boiler, dsb)          |
|    * Vite / Web Frontend Server                                       |
|  - Auto-Heal: Jika ada service crash, otomatis restart dalam 1 detik  |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|  LAYAR LOGIN UBUNTU (PC Aman Terkunci Password)                       |
|  * (Catatan: Data PLC & Database sudah aktif merekam di latar belakang)|
+-----------------------------------------------------------------------+
                                   | [Operator Memasukkan Password]
                                   v
+-----------------------------------------------------------------------+
|  LAPISAN 3: DESKTOP & USER INTERFACE (XDG / GNOME Autostart - Opsi 3B)|
|  * Status: HIDUP SETELAH OPERATOR LOGIN                               |
|  - Menjalankan ~/.config/autostart/agrovision.desktop                     |
|  - Google Chrome otomatis terbuka langsung ke http://localhost:5173   |
+-----------------------------------------------------------------------+
```

---

## 3. Keunggulan Arsitektur: Backend Mandiri Tanpa Login

Salah satu keunggulan terbesar arsitektur ini adalah **pemisahan total antara pemrosesan data PLC (Backend) dengan tampilan monitor (GUI)**:

| Aspek | Kondisi Sebelum Operator Login | Kondisi Setelah Operator Login |
| :--- | :---: | :---: |
| **Koneksi PLC (snap7)** | ✅ **AKTIF** (Membaca data real-time) | ✅ **AKTIF** |
| **Database PostgreSQL** | ✅ **AKTIF** (Menyimpan data logsheet) | ✅ **AKTIF** |
| **Pub/Sub Redis** | ✅ **AKTIF** (Menyiarkan status station) | ✅ **AKTIF** |
| **Backend API Service** | ✅ **AKTIF** | ✅ **AKTIF** |
| **Tampilan Layar (Chrome)** | 🔒 Tertahan di Layar Password | 🟢 **Terbuka Otomatis** ke AgroVision |

> **Keuntungan Utama:** Jika PC tiba-tiba restart karena listrik padam sebentar (*blackout/power trip*), begitu PC menyala kembali, sistem AgroVision sudah langsung mencatat data PLC ke database tanpa menunggu operator datang untuk mengetik password.

---

## 4. Perbandingan Model Tampilan Desktop (Opsi 3A vs Opsi 3B)

| Parameter | Opsi 3A (Auto-Login Kiosk) | Opsi 3B (Password Login - DIPILIH) |
| :--- | :--- | :--- |
| **Metode Masuk Desktop** | Langsung masuk tanpa password | Operator memasukkan password Ubuntu |
| **Tingkat Keamanan** | Terbuka untuk siapa saja di ruangan | **Tinggi (Hanya operator berwenang)** |
| **Waktu Chrome Terbuka** | Begitu booting selesai | Begitu operator selesai mengetik password |
| **Kesiapan Backend PLC** | Langsung aktif saat booting | Langsung aktif saat booting |
| **Kesesuaian Penggunaan** | Panel TV display publik / CCTV | **Workstation Ruang Kontrol Utama** |

---

## 5. Konsep Environment Variables di Linux Ubuntu

Di Windows, variabel sistem diatur melalui `System Properties -> Environment Variables`. Di Linux Ubuntu, variabel lingkungan dikelola secara modular, aman, dan persisten:

### A. Level Aplikasi (`.env` file)
Setiap modul di AgroVision memiliki file `.env` terisolasi:
* `/www/wwwroot/AgroVision/stations/sterilizer/backend/.env` (Konfigurasi DB, IP PLC `10.0.0.1`, Rack, Slot, Port, Redis, dsb).
* `/www/wwwroot/AgroVision/main-service/backend/.env`.

### B. Persistensi Melalui PM2 Snapshot (`pm2 save`)
* Ketika perintah `pm2 save` dijalankan, PM2 membuat file *dump state* di `~/.pm2/dump.pm2`.
* File dump ini menyimpan seluruh direktori kerja (*Cwd*), argumen script, dan **environment variables** masing-masing proses.
* Saat PC restart, PM2 membaca ulang dump ini sehingga variabel tidak akan pernah hilang.

### C. Level Standar Autostart GUI (`~/.config/autostart/`)
* Menggunakan standar resmi **XDG Desktop Application Autostart** (spesifikasi resmi *freedesktop.org*).
* Menjamin file `.desktop` yang diletakkan di folder ini akan selalu dijalankan otomatis oleh desktop manager Linux (GNOME / Ubuntu Desktop).

---

## 6. Panduan Langkah Demi Langkah (Step-by-Step Implementation - Opsi 3B)

> ⚠️ **Catatan:** Langkah di bawah ini adalah panduan teknis saat nanti bapak siap melakukan implementasi.

### Langkah 1: Pastikan Database Aktif Otomatis saat Booting
Jalankan perintah berikut agar PostgreSQL dan Redis selalu hidup saat OS dinyalakan:
```bash
sudo systemctl enable postgresql
sudo systemctl enable redis-server
sudo systemctl start postgresql
sudo systemctl start redis-server
```

---

### Langkah 2: Daftarkan PM2 ke Sistem Startup Ubuntu
1. Jalankan perintah generator startup dari PM2:
   ```bash
   pm2 startup
   ```
2. PM2 akan mengeluarkan satu baris perintah `sudo env PATH=...` khusus untuk PC bapak. Salin dan jalankan perintah tersebut di terminal.
3. Jalankan seluruh service AgroVision (atau gunakan file `ecosystem.config.cjs`):
   ```bash
   cd /www/wwwroot/AgroVision
   pm2 start ecosystem.config.cjs
   ```
4. Kunci dan simpan snapshot service saat ini:
   ```bash
   pm2 save
   ```
*(Mulai saat ini, setiap kali PC dinyalakan, seluruh backend dan PLC collector akan langsung aktif sebelum login).*

---

### Langkah 3: Pertahankan Keamanan Password Login (Opsi 3B)
* Pastikan pengaturan **Automatic Login** di Ubuntu dalam kondisi **NONAKTIF (OFF)** di menu `Settings -> Users`.
* Dengan ini, komputer tetap aman terkunci dengan password akun operator.

---

### Langkah 4: Konfigurasi Auto-Open Browser setelah Login
1. Buat folder autostart jika belum ada:
   ```bash
   mkdir -p ~/.config/autostart
   ```
2. Buat file `~/.config/autostart/agrovision.desktop` dengan isi:
   ```ini
   [Desktop Entry]
   Type=Application
   Name=AgroVision Station
   Comment=Otomatis Membuka AgroVision setelah Login
   Exec=google-chrome --start-maximized --noerrdialogs --disable-infobars http://localhost:5173
   Hidden=false
   NoDisplay=false
   X-GNOME-Autostart-enabled=true
   ```

---

## 7. Fitur Tambahan: Shortcut Desktop untuk Manual Control

Sebagai pelengkap, kita juga bisa meletakkan **Icon Aplikasi AgroVision di Layar Desktop** operator agar jika browser tidak sengaja tertutup, operator cukup klik 2x icon di desktop:

### File Desktop Shortcut (`~/Desktop/AgroVision.desktop`):
```ini
[Desktop Entry]
Version=1.0
Type=Application
Name=AgroVision Station
Comment=Sistem Monitoring & Kontrol Pabrik Kelapa Sawit
Exec=google-chrome http://localhost:5173
Icon=/www/wwwroot/AgroVision/stations/sterilizer/frontend/assets/logo.png
Terminal=false
StartupNotify=true
Categories=Industrial;Control;
```

---

## 8. Perintah Operasional & Troubleshooting

| Kebutuhan | Perintah Terminal |
| :--- | :--- |
| **Melihat Status Seluruh Service** | `pm2 status` |
| **Melihat Log Real-time PLC & Backend** | `pm2 logs` |
| **Melihat Log Khusus Sterilizer** | `pm2 logs sterilizer-station` |
| **Restart Seluruh Service Backend** | `pm2 restart all` |
| **Menyimpan Konfigurasi/Service Baru** | `pm2 save` |
| **Cek Status Database PostgreSQL** | `sudo systemctl status postgresql` |
| **Cek Status Cache Redis** | `sudo systemctl status redis-server` |

---

*Dokumen ini dibuat secara khusus untuk dokumentasi arsitektur sistem AgroVision Industrial SCADA Suite.*
