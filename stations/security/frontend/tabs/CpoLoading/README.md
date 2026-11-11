# CPO Loading

Tab pemantauan AI Vision untuk area Oil Dispatch / CPO Loading. Posisi navigasi: setelah **Truck Queues**, sebelum **Incidents**. Nama tab dibuat singkat; konteks AI Vision ditampilkan pada judul halaman.

## Status implementasi

Ini adalah implementasi **rancangan frontend**, bukan model deteksi atau layanan pencatatan AI. Seluruh kode khusus tab berada di folder ini. `SecurityStationPage.jsx` hanya memasang tab, meneruskan kamera/pengguna, dan memberikan kelas layout saat tab aktif. Komponen streaming CCTV bersama yang sudah ada dipakai tanpa perubahan.

- **Live CCTV** memakai kamera aktif bernama **Oil Dispatch** dari daftar kamera aplikasi, tanpa pemilih sumber kamera. Pencocokan nama tidak membedakan kapital dan menerima pemisah spasi/underscore/hyphen. ID tidak dikunci karena dapat berbeda antar instalasi. Pilihan kamera lama dari browser diabaikan. Oil Pipe Tank Dispatch, Loading Ramp, dan kamera yang hanya memiliki lokasi Oil Dispatch tidak dijadikan pengganti. Jika kamera tidak tersedia, panel menampilkan status tersebut. Transport CCTV bersama, status koneksi, dan layar penuh tetap digunakan; tidak ada reader kamera tambahan di backend.
- **Mode live** tidak mengulang nama tab, label rancangan, atau banner integrasi AI. Video mengisi frame secara proporsional (`cover`), sehingga sisi gambar dapat terpotong sesuai rasio frame; tidak ada ruang hitam tambahan dari mode `contain`. Nilai AI yang belum tersedia tetap `—`, bukan nol truk atau klaim area aman. Label simulasi tetap ditampilkan saat mode Data contoh dipilih.
- **Data contoh** menyediakan kunjungan, plat, confidence, ilustrasi zona/capture, durasi, dan tinjauan untuk menilai desain. Waktu simulasi tetap 16.42 WIB pada tanggal terpilih. Semua gambar adalah ilustrasi SVG, bukan bukti CCTV. Tinjauan contoh hanya bertahan selama tab tersebut dibuka.
- **Pengaturan jadwal** berfungsi sebagai draf lokal per browser dan akun. Penyimpanan tidak dibagikan ke pengguna lain dan belum mengendalikan alarm atau AI. Jangan gunakan draf ini sebagai izin operasional produksi.
- **Ekspor CSV** hanya tersedia pada data contoh dan mengikuti filter. Nama berkas dan kolom plat menyatakan data contoh.

Tidak ada migrasi, dependency baru, perubahan server, ataupun konfigurasi GPU pada pekerjaan ini. Setelah perubahan frontend ditarik, jalankan proses build/restart frontend yang biasa digunakan tim.

## Alur dan aturan tampilan

1. Ringkasan tanggal terpilih: kunjungan masuk dalam jam operasional, sesi yang masih di area, rata-rata pengisian selesai, dan aktivitas masuk di luar jadwal.
2. Halaman adalah workspace tetap tanpa scroll vertikal maupun horizontal. Pada desktop, CCTV di kiri; recent capture dan aktivitas ditumpuk dengan lebar yang sama di kanan. Capture memakai panel pendek dengan thumbnail mendatar dan kondisi kosong ringkas; aktivitas memakai sisa tinggi kolom, dengan jumlah baris menyesuaikan ruangnya. Kartu ringkasan jam operasional tidak ditampilkan; jadwal dibuka melalui tombol Atur jadwal / Lihat jadwal di toolbar. Pada layar kecil, tombol CCTV / Capture / Aktivitas mengganti panel tanpa menggulir. Pada layar pendek, ringkasan angka hanya muncul di panel CCTV untuk memberi ruang pada daftar/detail. Video selalu kondisi saat ini, meskipun tanggal aktivitas diubah ke tanggal lain.
3. Aktivitas dan capture memakai pagination. Kapasitas aktivitas menyesuaikan ruang panel melalui `ResizeObserver`; semua kunjungan tetap dapat dibuka tanpa daftar yang terpotong. Pencarian dan filter mengembalikan daftar ke halaman pertama. Ekspor CSV tetap mencakup seluruh hasil filter, bukan hanya halaman yang terlihat.
4. Dialog detail mempunyai bagian Ringkasan / Linimasa / Tinjauan. Linimasa menunjukkan masuk → mulai pengisian → selesai pengisian → keluar. Timestamp yang tidak diketahui tetap kosong; waktu tunggu tidak dianggap waktu pengisian.
5. Aktivitas di luar jadwal memerlukan verifikasi. Tampilan tidak menyimpulkan pencurian. Tinjauan sah tidak menghapus catatan aktivitas di luar jadwal.

Semua perhitungan tanggal dan batas jadwal memakai **Asia/Jakarta (WIB)**, terlepas dari zona waktu browser. Jam mulai termasuk waktu operasional; jam selesai menjadi batas eksklusif. Satu `visit.id` dihitung sekali. Truk yang kembali pada kunjungan berbeda dihitung sebagai kunjungan lain. Rerata pengisian hanya memakai sesi dalam jadwal yang memiliki waktu mulai dan selesai pengisian.

### Dua jenis jadwal yang terpisah

- **Normal:** default 07.00–17.00 WIB setiap hari. Manajemen dapat mengganti jam dan hari rutin; perubahan berlaku seterusnya. Jam normal lintas tengah malam didukung dan mengikuti hari dimulainya shift.
- **Khusus:** menggantikan jam pada satu tanggal WIB, memerlukan alasan, dan dapat berupa perpanjangan atau penutupan. Tanggal berikutnya mengikuti jadwal normal, kecuali ada pengecualian tersendiri. Jadwal khusus tidak dapat dibuat untuk tanggal lampau dan harus berada dalam satu tanggal; untuk perpanjangan melewati tengah malam gunakan pengecualian pada masing-masing tanggal.

Tanggal terpilih mengikuti pergantian hari WIB saat pengguna sedang melihat hari ini. Pemilihan tanggal riwayat tidak diubah otomatis. Pada rancangan ini klasifikasi contoh dihitung ulang terhadap draf jadwal; ini bukan audit historis yang tersimpan di server.

Staf dengan akses CCTV dapat melihat tab dan jadwal. Tombol perubahan jadwal/tinjauan dibatasi pada peran manajemen/admin/dev mengikuti informasi pengguna yang tersedia. Pembatasan frontend ini bukan pengganti otorisasi backend.

Dialog jadwal juga tetap tanpa scroll. Pengaturan normal tersedia dalam satu tampilan; jadwal khusus memakai dua langkah (tanggal/waktu, lalu alasan/konfirmasi). Footer dan tombol simpan/tutup selalu berada di dalam dialog. Mengubah panel, membuka dialog, atau berpindah halaman aktivitas tidak memasang ulang pemutar CCTV.

## Kebutuhan integrasi AI berikutnya

Bagian berikut adalah rancangan kontrak, belum endpoint yang diimplementasikan:

| Data | Informasi yang diperlukan |
| --- | --- |
| Kunjungan | ID kunjungan stabil, camera/zone ID, waktu masuk/keluar berformat ISO dengan offset/UTC, identitas truk opsional, confidence |
| Pengisian | Waktu mulai/selesai yang dikonfirmasi detektor aktivitas atau sensor; tidak boleh hanya memakai keberadaan truk |
| Evidence | ID capture, timestamp, gambar asli yang terotorisasi, jenis kejadian, ID kunjungan; jangan memakai URL RTSP/kredensial di browser |
| Jadwal | Jadwal normal dan tanggal efektif, pengecualian tanggal, zona waktu, versi jadwal, alasan, pembuat/pengubah dan waktu audit |
| Tinjauan | Status baru/ditinjau/tindak lanjut/sah, catatan, petugas, waktu, referensi izin; evidence asli dipertahankan |
| Kesehatan sistem | Kamera online/offline/video tertunda, inference siap/tidak siap, waktu deteksi terakhir, zona terkalibrasi, alarm aktif/tidak aktif |

Backend perlu menjadi sumber kebenaran bersama untuk jadwal, klasifikasi kejadian, perhitungan harian, dan tinjauan. Perubahan normal perlu tanggal efektif serta versi audit agar tidak mengubah klasifikasi riwayat diam-diam. Otorisasi manajemen harus diperiksa di server. Deteksi aktivitas yang berlanjut melewati jam tutup juga perlu aturan event tersendiri; rancangan hitungan saat ini mengklasifikasikan **waktu masuk**, bukan keseluruhan rentang keberadaan truk.

Sebelum menyalakan alarm nyata, kalibrasikan garis masuk/keluar dan zona pengisian, uji deduplikasi/tracking serta kondisi malam, lalu sambungkan notifikasi dan alur penanganannya. Tidak ada alarm suara contoh yang menyamar sebagai alarm operasional.

Untuk menghindari pemborosan sumber daya, pertahankan transport CCTV bersama; layanan inference nantinya perlu berbagi sumber frame dengan sampling/resolusi/batas FPS yang terukur. Penggunaan GPU/CPU untuk model harus diputuskan dari pengukuran model dan kapasitas server, bukan dari rancangan UI ini.

## Berkas dan verifikasi

| Berkas | Tanggung jawab |
| --- | --- |
| `CpoLoadingTab.jsx` / `CpoLoading.css` | Halaman, layout responsif, filter, ringkasan dan ekspor |
| `loadingModel.js` | Jadwal WIB, validasi, perhitungan dan pemilihan kamera |
| `demoData.js` | Data contoh eksplisit |
| `components/` | CCTV, capture, aktivitas dengan pagination, ilustrasi dan dialog |
| `loadingModel.test.mjs` | Pengujian aturan jadwal/perhitungan |

Dari root repository:

```powershell
node --test stations/security/frontend/tabs/CpoLoading/loadingModel.test.mjs
```

Build dari `main-service/frontend` menggunakan `npm run build`. UI diuji lokal dengan fixture kamera dan API, termasuk persistensi draf, pengecualian satu tanggal, akses staf, filter, tinjauan contoh, CSV, dialog/Escape, layar penuh, cleanup stream, serta pagination seluruh kunjungan/capture. Pemeriksaan ukuran konten memastikan panel dan dialog tidak terpotong atau memerlukan scroll pada viewport 1920×900, 1536×864, 1366×768, 1280×720, 1024×768, 390×844, dan 320×568, dengan tambahan ruang header aplikasi 100 px dalam fixture. Mode kosong dan jadwal baca saja turut diperiksa. Fixture pengujian tidak menjadi kode produksi dan tidak mengakses server Ubuntu.
