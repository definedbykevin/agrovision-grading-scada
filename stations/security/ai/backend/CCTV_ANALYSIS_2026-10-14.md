# Analisis CCTV feed — 14 Oktober 2026

## Pemeriksaan lanjutan setelah deployment

Pada server pengguna, commit `c42f8e8` sudah di-pull tetapi PM2 masih menjalankan
entry lama `app.py`. Proses Python lain tetap memegang port 4101 setelah entry
PM2 dihentikan. Setelah proses itu diidentifikasi dan dihentikan, service
didaftarkan ulang dari ecosystem menggunakan `run-service.cjs`. Endpoint lalu
menampilkan diagnostik versi baru; 46 kamera menjadi LIVE dan kamera ID 35
tetap OFFLINE dengan RTSP 404. Semua reader pada sampel berikutnya masih idle
ketika layar pengguna menunjukkan seluruh grid RECONNECT. Ini mempersempit
pemeriksaan ke jalur delivery/subscription, bukan kegagalan seluruh RTSP.

Pemeriksaan langsung melalui domain `kip.premier-engineering.my.id` memakai
47 ID dan 18 kamera terlihat, preview 320 piksel, selama 20,04 detik. Dengan
receiver yang membaca binary tanpa decode/render, hasilnya: first byte 0,40
detik, throughput 1,51 MB/detik, median penerimaan 7,4 FPS per kamera,
backlog relatif terhadap clock send maksimum 6.554,2 ms, dan 2.759 packet
melewati ambang backlog 1.500 ms. HTTP mengembalikan 200 dan stream tetap
mengirim status LIVE. Pengujian sengaja dihentikan setelah 20 detik; exit curl
28 pada probe ini adalah batas durasi, bukan bukti stream mati sendiri.

Ini membuktikan adanya backlog pada jalur domain dalam kondisi pengukuran
tersebut. Lokasi hambatan spesifik (proxy/tunnel/jaringan) belum terisolasi, dan
kapasitas jalur dapat berubah. Backlog seperti ini memicu pemulihan koneksi
browser. Membuka socket baru dengan beban JPEG yang sama belum cukup.

Patch lanjutan menurunkan ukuran grid saat backlog menetap: dari permintaan
awal berbasis tile, dibagi dua sampai minimum 160 piksel. Jika masih tertinggal,
FPS pengiriman diturunkan hanya pada koneksi penonton tersebut. Batas global
tetap 30; reader kamera, penonton lain, snapshot, dan resolusi fullscreen tetap
independen. Fullscreen mempunyai budget FPS tersendiri. Resolusi/FPS grid bisa
lebih rendah ketika koneksi terbatas; ini adalah tradeoff eksplisit untuk
mengirim gambar terbaru, bukan jaminan 30 FPS pada bandwidth berapa pun.

Regresi lanjutan: 23 tes Python, 10 tes transport browser, dan satu tes
CRUD/proxy terisolasi. Build frontend juga diuji. Tes transport mencakup
backlog menetap, pengurangan width, fallback FPS, pemulihan semua kamera,
berhentinya reconnect berulang, dan pemisahan budget fullscreen. Ada juga
pemeriksaan throughput dari selisih sequence producer: koneksi yang hanya
mengirim sebagian kecil frame tanpa timestamp backlog tetap dapat mengurangi
beban. Producer yang memang lambat tidak otomatis dianggap sebagai masalah
delivery.

Uji integrasi browser lanjutan menggunakan 47 channel fixture (24 tile
terlihat), source sequence 30 FPS, dan proxy Transform yang membatasi transfer
sekitar 1,5 MB/detik. Dalam 30,68 detik, ada dua penyesuaian awal (tiga
connection attempts total), lalu budget menjadi preview 160 piksel/15 FPS.
Median FPS paint pada 10 detik terakhir adalah 15; semua 47 channel berstatus
LIVE pada sampel pengamatan, tanpa error browser. Ini fixture JPEG/sequence,
bukan jaminan FPS seluruh kamera nyata. Pembatasan hanya digunakan di server
tes terpisah dan tidak dipasang pada proxy produksi.

Bagian di bawah mencatat analisis dan pengujian awal sebelum follow-up ini.

Perbaikan dibatasi pada jalur CCTV: RTSP preview, pengiriman live, proxy CCTV,
decoder/renderer browser, diagnostik, dan tesnya. Kode inference AI, logsheet,
dashboard, database kamera produksi, dan pengaturan rekaman NVR tidak diubah.
Perubahan pengguna yang sudah ada pada `SecurityStationPage.jsx` dan
`CctvModal.jsx` dipertahankan.

## Temuan dan tingkat kepastian

Rekaman berdurasi 22,03 detik, beresolusi 1920×1080, dan direkam pada 30 FPS.
Angka 30 FPS file rekaman adalah FPS perekaman layar, bukan FPS setiap kamera.
Pada awal rekaman terdapat 46 kamera LIVE dan satu kamera tidak aktif. Dalam
beberapa detik, seluruh grid berubah menjadi RECONNECT. Kejadian serentak ini
mengarah ke gangguan koneksi/delivery bersama atau keterlambatan pemrosesan
browser; rekaman saja tidak membuktikan bahwa seluruh kamera RTSP terputus.

Endpoint service yang dapat diakses (`/api/security-ai/stream/status`)
melaporkan 47 reader preview: 46 LIVE, satu OFFLINE. Semua reader sehat
melaporkan `source_fps=20`, `target_fps=30`, dan `decoder=cpu`.
Kamera ID 52 mengalami kegagalan RTSP berulang dan telah mencoba main fallback.
Gangguan kamera tersebut harus diperiksa tersendiri, melalui URL/channel RTSP,
akses NVR, status kamera, dan jaringan. Kegagalan satu kamera tidak seharusnya
memutus 46 kamera lainnya.

Batas aplikasi sudah maksimum 30 FPS melalui clamp 1–30 pada
`CCTV_PREVIEW_FPS`. Contoh `.env` masih memuat 15 FPS dan sudah diperbaiki menjadi
30. `.env` aktif yang diperiksa tidak memuat override CCTV FPS. FPS sumber 20
adalah nilai yang dilaporkan decoder, bukan hasil audit konfigurasi NVR.
Aplikasi tidak dapat menghasilkan 30 frame unik/detik dari sumber 20 FPS.
FPS aktual juga bisa lebih rendah akibat CPU, encoding, delivery, dan browser.

Ada empat hambatan yang ditemukan pada kode lama:

1. Loop delivery melakukan query database setiap lima detik. Timeout database
   bisa menghentikan sementara pengiriman seluruh kamera pada satu koneksi.
2. JPEG terfragmentasi menyebabkan seluruh buffer parsial disalin ulang pada
   setiap chunk jaringan. Beban salinan meningkat saat banyak feed diterima.
3. Banyak kamera dapat memulai decode sekaligus. Kamera yang sudah selesai
   decode dapat langsung decode lagi sebelum bitmap sebelumnya sempat dicat.
4. Grid kecil selalu menerima JPEG preview sampai 640 piksel dan banyak packet
   HTTP kecil. Ini menambah encoding, bandwidth, alokasi bitmap, dan rendering.

Hambatan ini terbukti dari alur kode dan pengujian. Pemicu persis kejadian di
rekaman belum dapat dipastikan karena tidak ada trace browser/jaringan/GPU
pada detik kejadian. Log yang tersedia tidak cukup untuk mengatribusikan
kejadian itu ke satu penyebab tertentu. Tidak ada klaim bahwa persentase GPU
PC server telah diukur atau bahwa seluruh masalah RTSP telah terselesaikan.

## Perubahan

- Konfigurasi live menggunakan snapshot supervisor CCTV. Query database berada
  di luar loop delivery. Snapshot baru diterapkan saat supervisor menerbitkannya;
  kegagalan database mempertahankan konfigurasi terakhir.
- Pengiriman endpoint live menggabungkan packet satu putaran polling menjadi
  batch sekitar 2 MiB. Packet tetap memiliki header/payload sendiri, dan batch
  langsung dikirim tanpa menunggu terisi penuh.
- Browser mengirim lebar preview sesuai tile yang terlihat, minimal 320 piksel,
  dibulatkan ke atas per 80 piksel. Backend membatasi lebar pada konfigurasi
  `CCTV_PREVIEW_WIDTH`. Jika ada beberapa viewer, reader menggunakan kebutuhan
  terbesar yang masih aktif; permintaan viewer yang ditutup kedaluwarsa setelah
  dua detik. Perubahan layout memperbarui subscription melalui ResizeObserver.
- Resolusi frame sumber tetap disimpan. Fullscreen tetap mendapat detail sampai
  1280 piksel. Snapshot main stream tetap mempertahankan resolusi sumber.
- Parser mengalokasikan payload JPEG sekali, lalu mengisinya dari chunk jaringan.
- Decode dibatasi maksimum delapan pekerjaan bersamaan per koneksi. Satu kamera
  hanya menyimpan satu JPEG pending, dan harus menampilkan bitmap yang telah
  selesai sebelum melakukan decode berikutnya. JPEG baru menggantikan pending
  lama. Error JPEG diisolasi pada kameranya.
- Bitmap disesuaikan dengan ukuran tampilan, mempertahankan aspect ratio.
  Misalnya bitmap 640×360 menjadi 320×180 pada tile 320 piksel: jumlah piksel
  bitmap turun 75%. Ini bukan pengukuran penurunan persentase GPU.
- Counter `data-cctv-rendered-frames` kini menghitung bitmap unik yang benar-benar
  dicat, bukan hanya decode yang selesai. `getCctvDiagnostics()` menyediakan
  antrean decode, jumlah koneksi, frame/backlog yang dibuang, ukuran bitmap,
  error decode, dan alasan terakhir kegagalan transport.
- Diagnostik backend menambahkan `encoded_fps`, `encoding_mode`, dan
  `preview_resolution`, sehingga target FPS tidak tertukar dengan FPS aktual.

Decoding RTSP tetap memilih CPU dengan `VIDEO_ACCELERATION_NONE`. Canvas CCTV
tetap memakai `alpha:false` dan `willReadFrequently:true`. Dokumentasi
[OpenCV](https://docs.opencv.org/4.13.0/d4/d15/group__videoio__flags__base.html)
menjelaskan kontrol akselerasi capture;
[MDN Canvas](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext)
menjelaskan backing software Canvas2D;
[MDN ImageBitmap](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap)
menjelaskan opsi resize. Compositing browser/desktop masih dapat memakai GPU.
Memindahkan decoding ke CPU tidak menghilangkan biaya decoding: CPU tetap harus
menguras seluruh sumber RTSP, termasuk kamera yang tidak terlihat.

## Hasil pengujian

Lingkungan pengukuran lokal: Intel Core i9-13900H, 20 logical processors,
sekitar 16 GB RAM, RTX 4060 Laptop GPU dan Intel Iris Xe. Ini adalah lingkungan
yang dapat diakses saat pemeriksaan; spesifikasi PC server kejadian belum
dikonfirmasi oleh pengguna.

| Pengujian | Hasil | Batas interpretasi |
| --- | --- | --- |
| Status service aktif | 46 LIVE, 1 OFFLINE; target 30, sumber sehat dilaporkan 20 FPS, decoder CPU | Service aktif masih versi sebelumnya |
| Jalur lama, 47 kamera nyata, dibaca langsung selama sekitar 8 detik | Median delivery 13,9 FPS, median kenaikan sequence producer 17,0 FPS, 23,39 MB/detik | Pembacaan langsung; bukan FPS layar |
| Uji eksplorasi Chrome, 24 kamera nyata | Jalur browser baru sekitar 12,9–19,1 FPS, median 15,7; satu koneksi, semua LIVE | Backend aktif masih lama; beban saat tiap run berbeda |
| Uji eksplorasi Chrome, semua 47 kamera nyata sebelum backend baru dimuat | 46 LIVE tetapi FPS dapat turun sekitar 2,5–3 FPS | Bukti bahwa optimasi browser saja belum cukup |
| Backend Python baru → router proxy CCTV baru → Chrome baru, 47 stream simulasi 30 FPS, tile 320 piksel | 30,77 detik: minimum 28,9, median 29,9, maksimum 30 FPS; 47 LIVE; satu koneksi; tanpa backlog/reconnect/error browser | Fixture JPEG berulang dengan sequence berjalan, bukan 47 kamera nyata/NVR |
| JPEG dari kamera nyata ID 18, kualitas sama 72, dire-encode lokal | 640 piksel: 31.099 byte; 320 piksel: 8.892 byte, sekitar 71% lebih kecil | Sampel satu frame/kamera, bukan jaminan semua stream |
| Regresi backend Python | 21 tes lolos | Termasuk pacing, snapshot, fullscreen, alias, width lease, batching, stale/offline, perubahan konfigurasi |
| Regresi transport browser | 8 tes lolos | Termasuk 47 kamera, decode lambat, JPEG rusak, offscreen, modal, cleanup, dan reconnect |
| CRUD/proxy CCTV dengan database tes terisolasi | 1 tes lolos | Database `cctv_verify_api_<pid>` dibuat lalu dihapus; kamera produksi tidak diubah |
| Build frontend produksi | Lolos | Output verifikasi ke direktori TEMP; tidak mengganti build yang sedang dilayani |

Angka simulasi membuktikan kapasitas jalur baru dalam kondisi uji. Angka itu
tidak membuktikan 30 FPS pada NVR nyata atau stabilitas jangka panjang di PC
server. Variasi pengujian kamera nyata tidak digunakan untuk mengklaim
persentase peningkatan performa yang terkontrol.

## Penerapan dan verifikasi pada PC server

Perubahan sudah berada di source workspace dan diuji. Proses produksi yang
sedang berjalan serta build yang sedang dilayani belum diganti. Service simulasi
berjalan pada port terpisah saat pengujian dan dihentikan setelah selesai.

Gunakan proses deployment yang biasa untuk memperbarui frontend dan memuat
perubahan service `security-station` serta `security-ai-service`. Tidak perlu
restart seluruh ekosistem. Pastikan environment efektif service berisi
`CCTV_PREVIEW_FPS=30`; nilai dari PM2/environment dapat mengalahkan isi `.env`.

Untuk sumber 30 FPS, periksa pengaturan substream kamera/NVR. Jika perangkat
mendukung 30 FPS, pilih frame rate 30 dan resolusi substream yang cukup untuk
preview, misalnya 640×360. Dukungan frame rate harus dicek pada model perangkat.
Jangan mengubah main stream/rekaman hanya untuk menurunkan beban grid. Substream
1280×720 pada puluhan kamera tetap mahal untuk decoding CPU meski JPEG keluaran
diperkecil. Tidak ada konfigurasi NVR yang diubah dalam pekerjaan ini.

Setelah versi baru dimuat, pantau endpoint status: `source_fps`, `encoded_fps`,
`preview_resolution`, `age_ms`, dan `reconnects`. Ukur FPS layar dari selisih
`data-cctv-rendered-frames` dibagi durasi pengukuran. Lakukan pengukuran steady
state setelah kamera warm, untuk grid yang biasa digunakan dan fullscreen.
`encoding_mode=idle` dengan sekitar 1 FPS adalah perilaku penghematan saat kamera
tidak ditonton, bukan penurunan target feed yang sedang ditonton.

Bandingkan GPU dan CPU sebelum/sesudah pada jumlah tile, ukuran jendela, dan
durasi yang sama. Task Manager perlu memisahkan Video Decode, 3D/compositing,
GPU browser, dan proses Python; total GPU juga dapat berasal dari aplikasi lain
atau screen recorder. Persentase penurunan GPU belum dapat dipastikan dari
rekaman yang diberikan. Pengujian nyata setelah deployment masih diperlukan
untuk menutup verifikasi performa PC server.
