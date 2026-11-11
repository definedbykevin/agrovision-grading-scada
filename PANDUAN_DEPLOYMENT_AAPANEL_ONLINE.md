E# 🌐 PANDUAN LENGKAP: DEPLOYMENT AgroVision ONLINE MENGGUNAKAN aaPanel & AUTO-START
**Dokumentasi Rekam Jejak (Progress), Konfigurasi Nginx Reverse Proxy, SSL, dan Akses Jaringan Online**

---

## 📑 Daftar Isi
1. [Ringkasan Proyek & Tujuan](#1-ringkasan-proyek--tujuan)
2. [Rekap Langkah yang SUDAH Dilakukan (Progress Selesai)](#2-rekap-langkah-yang-sudah-dilakukan-progress-selesai)
3. [Langkah yang AKAN Dilakukan (Roadmap Menuju Online)](#3-langkah-yang-akan-dilakukan-roadmap-menuju-online)
   * [Tahap 1: Konfigurasi Website & Reverse Proxy di aaPanel](#tahap-1-konfigurasi-website--reverse-proxy-di-aapanel)
   * [Tahap 2: Otomatisasi Service Backend & PLC (PM2 Daemon)](#tahap-2-otomatisasi-service-backend--plc-pm2-daemon)
   * [Tahap 3: Konfigurasi Desktop Shortcut & Autostart (Opsi 3B)](#tahap-3-konfigurasi-desktop-shortcut--autostart-opsi-3b)
   * [Tahap 4: Meng-online-kan Sistem ke Pengguna Luar](#tahap-4-meng-online-kan-sistem-ke-pengguna-luar)
   * [Tahap 5: Pemasangan Sertifikat Keamanan SSL / HTTPS (Let's Encrypt)](#tahap-5-pemasangan-sertifikat-keamanan-ssl--https-lets-encrypt)
4. [Matriks Keamanan Akses (Local OT vs Public IT)](#4-matriks-keamanan-akses-local-ot-vs-public-it)
5. [Tabel Perintah Cepat (Maintenance & Monitoring)](#5-tabel-perintah-cepat-maintenance--monitoring)

---

## 1. Ringkasan Proyek & Tujuan

Sistem AgroVision (Industrial Palm Oil Monitoring & Automation System) dijalankan pada server **Ubuntu 24.04 LTS (24 Cores CPU, 32GB RAM)**.

**Target Akhir:**
1. **Lokal / Ruang Kontrol:** Operator menyalakan PC $\rightarrow$ Login $\rightarrow$ Layar monitoring terbuka otomatis $\rightarrow$ Data PLC terbaca real-time.
2. **Online / Kantor Pusat (Head Office):** Manajemen dan tim teknis dapat memantau seluruh stasiun pabrik melalui web browser secara aman via internet dengan enkripsi HTTPS.

---

## 2. Rekap Langkah yang SUDAH Dilakukan (Progress Selesai)

Berikut adalah tahapan yang telah berhasil diselesaikan:

* [x] **Pemeriksaan Akses aaPanel:**
  * Memeriksa port dan URL login melalui `sudo bt default`.
* [x] **Pengaturan Kredensial Keamanan Panel:**
  * Mereset password login panel via `sudo bt 5`.
* [x] **Akses Dashboard aaPanel:**
  * Berhasil login ke antarmuka web aaPanel di `https://127.0.0.1:36039/xxxx`.
* [x] **Instalasi Paket Software Inti di App Store aaPanel:**
  * ✅ **Nginx 1.24.0** *(Web Server & Reverse Proxy)* $\rightarrow$ Status: **Running (Hijau)**
  * ✅ **Redis 7.0.12** *(Cache & Pub/Sub Live Data)* $\rightarrow$ Status: **Running (Hijau)**
  * ✅ **Node.js Version Manager 2.3** *(Runtime JavaScript)* $\rightarrow$ Status: **Running (Hijau)**
  * ✅ **PM2 Manager 5.2** *(Process Manager)* $\rightarrow$ Status: **Running (Hijau)**
  * ✅ **PostgreSQL Manager 2.9** *(Database Relasional)* $\rightarrow$ Status: **Running (Hijau)**

---

## 3. Langkah yang AKAN Dilakukan (Roadmap Menuju Online)

---

### 🟢 TAHAP 1: Konfigurasi Website & Reverse Proxy di aaPanel

Tahap ini menghubungkan Web Server Nginx ke aplikasi frontend AgroVision agar bisa diakses langsung via Port 80 (tanpa harus mengetik `:5173`).

#### Langkah 1A: Tambah Website Baru
1. Buka menu **Website** di sidebar kiri aaPanel.
2. Klik tombol **Add site**.
3. Masukkan konfigurasi:
   * **Domain name:** Masukkan IP lokal server atau domain (contoh: `10.0.0.2` atau `localhost` atau nama domain).
   * **Description:** `AgroVision Web Station`
   * **Root directory:** `/www/wwwroot/AgroVision`
   * **PHP Version:** Pilih **`pure static`**
4. Klik **Submit**.

#### Langkah 1B: Buat Reverse Proxy dengan Dukungan WebSocket
1. Pada daftar website, klik nama site yang baru dibuat.
2. Pilih menu **Reverse Proxy** di sisi kiri jendela pop-up.
3. Klik **Add reverse proxy**, lalu isi:
   * **Proxy Name:** `agrovision-proxy`
   * **Target URL:** `http://127.0.0.1:5173`
   * **Sent Domain:** `$host`
   * **WebSocket:** Centang / Aktifkan ✅ *(Wajib agar streaming data PLC real-time tanpa delay)*
4. Klik **Save**.

---

### 🟢 TAHAP 2: Otomatisasi Service Backend & PLC (PM2 Daemon)

Memastikan seluruh backend, API Gateway, dan PLC Collector hidup otomatis saat PC dinyalakan di background (sebelum operator login).

1. Jalankan perintah startup generator:
   ```bash
   pm2 startup
   ```
2. Salin dan jalankan perintah `sudo env PATH=...` yang diberikan oleh PM2.
3. Jalankan seluruh ekosistem AgroVision:
   ```bash
   cd /www/wwwroot/AgroVision
   pm2 start ecosystem.config.cjs
   ```
4. Kunci dan simpan konfigurasi permanen:
   ```bash
   pm2 save
   ```

---

### 🟢 TAHAP 3: Konfigurasi Desktop Shortcut & Autostart (Opsi 3B)

Memastikan PC tetap aman dengan password login Ubuntu, dan begitu operator masuk ke desktop, browser otomatis membuka AgroVision.

#### 3A. Autostart Browser setelah Login
Buat file `~/.config/autostart/agrovision.desktop`:
```ini
[Desktop Entry]
Type=Application
Name=AgroVision Station
Comment=Autostart AgroVision pada Desktop Login
Exec=google-chrome --start-maximized --noerrdialogs --disable-infobars http://localhost
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
```

#### 3B. Icon Shortcut di Layar Desktop
Buat file `~/Desktop/AgroVision.desktop`:
```ini
[Desktop Entry]
Version=1.0
Type=Application
Name=AgroVision Station
Comment=Sistem Monitoring & Kontrol Pabrik Kelapa Sawit
Exec=google-chrome http://localhost
Icon=/www/wwwroot/AgroVision/stations/sterilizer/frontend/assets/logo.png
Terminal=false
StartupNotify=true
Categories=Industrial;Control;
```

---

### 🟢 TAHAP 4: Meng-online-kan Sistem ke Pengguna Luar

Ada 3 metode industri yang dapat dipilih untuk membuka akses ke luar pabrik:

```
+-------------------------------------------------------------------------------+
| METODE 1: IP PUBLIK STATIS & PORT FORWARDING (Standar ISP Pabrik)             |
| - ISP Pabrik menyediakan 1 IP Publik Statis (contoh: 112.215.xxx.xxx)         |
| - Pada Router Pabrik: Forward Port 80 & 443 ke IP Server (10.0.0.2)        |
| - Pengguna di luar membuka: http://112.215.xxx.xxx atau domain perusahaan     |
+-------------------------------------------------------------------------------+
| METODE 2: CLOUDFLARE TUNNEL (Paling Praktis, Tanpa Buka Port / IP Publik)     |
| - Menggunakan connector Cloudflare Tunnel (cloudflared) gratis                |
| - Trafik dienkripsi penuh menuju domain perusahaan (misal: scada.agrovision.internal)  |
| - Aman dari serangan DDOS dan tidak memerlukan IP Publik Statis               |
+-------------------------------------------------------------------------------+
| METODE 3: PRIVATE MESH VPN (Tailscale / ZeroTier - Paling Aman untuk SCADA)   |
| - Server dan HP/Laptop manajemen di-install Tailscale/ZeroTier                |
| - Membentuk jaringan privat virtual antar cabang tanpa terekspos ke publik    |
+-------------------------------------------------------------------------------+
```

---

### 🟢 TAHAP 5: Pemasangan Sertifikat Keamanan SSL / HTTPS (Let's Encrypt)

Setelah domain terhubung (misal `scada.agrovision.internal`), aktifkan enkripsi HTTPS di aaPanel:

1. Di menu **Website** aaPanel $\rightarrow$ Klik nama website.
2. Buka tab menu **SSL**.
3. Pilih tab **Let's Encrypt**.
4. Centang nama domain bapak $\rightarrow$ Klik **Apply**.
5. Aktifkan saklar **Force HTTPS** agar semua koneksi otomatis aman terenkripsi.

---

## 4. Matriks Keamanan Akses (Local OT vs Public IT)

| Jalur Akses | Pengguna | Port yang Digunakan | Tingkat Keamanan |
| :--- | :--- | :---: | :--- |
| **Kabel LAN PLC (OT Network)** | snap7 Backend $\rightarrow$ PLC | **Port 102** | 🔒 **Terisolasi Lokal** (Tidak boleh tembus internet) |
| **Layar Operator Ruang Kontrol** | Operator Pabrik | **Port 80 / 5173** | 🔒 Terlindungi Password Ubuntu Login |
| **Akses Web Luar (IT Network)** | Direksi / Manajemen Kantor | **Port 443 (HTTPS)** | 🛡️ Terenkripsi SSL + Auth Token AgroVision |

---

## 5. Tabel Perintah Cepat (Maintenance & Monitoring)

| Kebutuhan | Perintah Terminal |
| :--- | :--- |
| **Cek Status Semua Service Backend** | `pm2 status` |
| **Cek Log Real-time PLC & Sterilizer** | `pm2 logs sterilizer-station` |
| **Cek Status Web Server Nginx** | `sudo systemctl status nginx` |
| **Restart Seluruh Backend AgroVision** | `pm2 restart all` |
| **Melihat Info Login aaPanel** | `sudo bt default` |
| **Ganti Password aaPanel** | `sudo bt 5` |
| **Cek Status Database PostgreSQL** | `sudo systemctl status postgresql` |
| **Cek Status Cache Redis** | `sudo systemctl status redis-server` |

---

*Dokumen ini merupakan panduan operasional dan deployment arsitektur AgroVision SCADA Suite.*
