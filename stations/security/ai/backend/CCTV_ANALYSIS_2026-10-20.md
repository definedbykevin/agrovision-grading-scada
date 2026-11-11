# Pemeriksaan dan perbaikan CCTV — 20 Oktober 2026

Perubahan sudah diterapkan pada server Ubuntu pengguna. Cadangan sebelum perubahan:
`backups/cctv-20261020-175010`. Hanya service `security-ai-service` dan
`security-station` yang dimuat ulang. Frontend produksi melalui Vite sudah
diperiksa menyajikan transport baru. Tidak ada konfigurasi NVR, rekaman,
database kamera produksi, atau model computer vision yang diubah.

## Temuan langsung pada server

- Sebelum perubahan, proses Python CCTV sudah berjalan sekitar 2 hari 22 jam.
  Pada sampel pemeriksaan, CPU host masih memiliki sekitar 82% idle. Angka
  proses Python sekitar 250% berarti sekitar 2,5 logical CPU, bukan seluruh
  CPU server penuh. Ini tidak mendukung kesimpulan bahwa CPU penuh menyebabkan
  seluruh tampilan restart.
- GPU server teridentifikasi sebagai **NVIDIA GeForce RTX 5060 Ti, 8 GB**.
  `nvidia-smi` melaporkan sekitar 1% utilisasi dan 673 MiB VRAM terpakai.
  Streaming memakai decoder CPU; tidak ada pemindahan pekerjaan CCTV ke CUDA.
- Ada 47 reader: 46 LIVE dan kamera ID 35 OFFLINE. Sebanyak 22 reader telah
  menetap di `main-fallback`. Resolusi sumber mencakup 1080p dan 1440p walaupun
  yang diperlukan hanya preview. Reader fallback tidak pernah memeriksa lagi
  apakah substream sudah pulih selama main stream masih bekerja.
- Probe terpisah untuk tiga reader fallback, ID 4, 1, dan 2, berhasil membuka
  substream 1280×720. Jadi kondisi fallback mereka memang sudah tidak diperlukan
  pada saat pemeriksaan. Probe tidak menghentikan reader produksi.
- RSS Python sebelum perubahan sekitar 10,74 GiB. Sampel setelah restart dan
  pemulihan profil substream sekitar 6,28 GiB. Perbandingan ini melibatkan umur
  proses dan profil sumber berbeda; ini bukan bukti bahwa kebocoran memori
  jangka panjang sudah ditemukan atau dihilangkan. Sampel `vmstat` tidak
  menunjukkan swap-in/swap-out aktif meskipun swap masih terisi.

## Penyebab yang diperbaiki pada kode

1. **Reconnect dipakai sebagai mekanisme penyesuaian bandwidth.** Kode lama
   melempar error dan membuka ulang koneksi gabungan ketika memperkecil preview
   atau menurunkan FPS. Scroll, perubahan ukuran grid, dan modal juga mengganti
   koneksi. Ini dapat terlihat seperti semua CCTV restart bersamaan.
2. **Backpressure HTTP belum mengontrol seluruh jalur sampai browser.** Proxy
   dapat menerima data lebih cepat daripada browser memakainya. Reconnect baru
   tidak menyelesaikan penyebab antrean apabila beban JPEG tetap sama.
3. **Ukuran JPEG mengikuti viewer terbesar.** Viewer lambat yang meminta 160
   piksel masih dapat menerima JPEG 640 piksel jika viewer lain meminta ukuran
   tersebut. Akibatnya penyesuaian bandwidth viewer lambat tidak efektif.
4. **Pemeriksaan FPS dilakukan sesudah mengambil gambar detail.** Saat delivery
   dibatasi, fullscreen masih bisa memicu encoding frame yang tidak dikirim.
5. **Fallback main stream tidak pulih otomatis.** Gangguan substream sementara
   meninggalkan preview di sumber yang jauh lebih berat secara permanen.
6. **Referensi jam tidak pernah diperbarui.** Perbedaan laju jam monotonic
   browser/server dapat dianggap sebagai backlog setelah menonton berjam-jam.
   Referensi sekarang memakai minimum offset satu menit terakhir dengan jumlah
   sampel terbatas. Tes menyimulasikan delapan jam drift dan tetap mendeteksi
   backlog jaringan yang sebenarnya; ini bukan pengujian kamera nyata delapan jam.

Transport sekarang menggunakan acknowledgement browser dengan batas batch dan
watermark byte per viewer. Jika viewer lambat, pengiriman berhenti sementara
reader tetap memperbarui frame terbaru. Perubahan subscription dan bandwidth
dikirim melalui endpoint kontrol pada koneksi video yang sama. Koneksi yang
benar-benar putus tetap memiliki mekanisme pemulihan.

JPEG ukuran berbeda memiliki cache per frame dan per ukuran. Viewer kecil
mendapat ukuran yang dimintanya walaupun ada viewer lain yang lebih besar.
Pacing diperiksa sebelum mengambil/encoding gambar detail. Reader fallback
memeriksa substream di latar belakang setiap sekitar lima menit dengan jitter;
peralihan hanya dilakukan setelah probe berhasil mendecode gambar.

## Pengujian

| Pengujian | Hasil |
| --- | --- |
| Regresi Python | 30 tes lolos; termasuk batas credit, ACK invalid, expiry, subscription dinamis, ukuran JPEG antar viewer, probe gagal, dan handover substream |
| Regresi transport | 12 tes lolos; termasuk drift jam, adaptasi, modal dan resize dengan satu koneksi serta serialisasi feedback |
| Proxy delivery | 1 tes lolos; header negosiasi, penerusan JSON feedback dan pelepasan upstream |
| CRUD/proxy database terisolasi | 1 tes lolos; hanya database tes sementara yang dibuat/dihapus |
| Build frontend produksi | Lolos; hasil build verifikasi berada di direktori TEMP |
| Browser, 47 sumber simulasi 30 FPS, tanpa throttle | 47 LIVE, satu koneksi, median sekitar 29,9 FPS, tanpa error browser |
| Browser, 47 sumber simulasi, jalur 1,5 MB/detik | 47 LIVE, 24 tile terlihat sekitar 15 FPS, satu koneksi termasuk modal dan penyesuaian budget |
| Domain HTTPS produksi, kamera nyata, sekitar 2 menit | 46 LIVE, ID 35 OFFLINE, 24 tile terlihat median 16,5 FPS (sekitar 13,2–18,2), satu koneksi termasuk buka/tutup modal, tanpa backlog/error browser |
| Pemantauan lanjutan domain produksi, sekitar 5 menit | 46 LIVE, ID 35 OFFLINE, satu koneksi; 24 tile terlihat median 16,0 FPS (13,4–18,7), fullscreen sekitar 14,7 FPS; tanpa backlog/error browser |
| Seluruh 47 tile nyata terlihat, gateway melalui SSH, sekitar 3 menit | 46 LIVE dan satu koneksi, tetapi budget turun menjadi 3 FPS karena kapasitas delivery pada jalur uji ini |

Pengujian domain menggunakan kode transport yang disajikan frontend produksi
dan endpoint gateway produksi, dengan Chrome baru pada laptop. DOM canvas uji
dibuat pada halaman terpisah; tidak mengubah data pengguna. Pengukuran FPS
menggunakan perubahan counter bitmap unik yang benar-benar dicat ke canvas.
Pengujian SSH dan domain memakai jalur berbeda dan bukan benchmark throughput
terkontrol yang dapat dibandingkan langsung.

Hasil simulasi tidak boleh dibaca sebagai FPS NVR nyata. Sumber kamera nyata
melaporkan 20 FPS; batas aplikasi 30 FPS tidak dapat membuat 30 frame unik dari
sumber tersebut. Semua 47 gambar nyata sekaligus belum terbukti mulus pada
setiap jalur jaringan. Adaptasi menukar detail/FPS untuk menjaga frame tetap
baru dan menghindari reset seluruh grid.

Hasil JSON terperinci disimpan lokal di `stations/security/verification/`:
`cctv-flow-fixture-2026-10-20.json`, `cctv-flow-throttled-2026-10-20.json`,
`cctv-flow-real-2026-10-20.json`, dan `cctv-flow-public-real-2026-10-20.json`.
Pemantauan lima menit: `cctv-flow-public-final-2026-10-20.json`.
Folder tersebut diabaikan Git untuk artefak pengukuran baru.

## CPU, GPU, dan kapasitas computer vision

**Untuk beban preview yang diukur, decoding CPU tetap layak.** Memindahkan CCTV
ke NVIDIA belum diperlukan untuk memperbaiki masalah delivery di atas. Selama
sampel dengan viewer aktif, CPU host masih memiliki kapasitas idle yang besar
dan NVIDIA tetap sekitar 1%. Memakai substream yang sesuai dan membatasi frame
tertunda mengurangi pekerjaan yang tidak membantu tampilan.

NVIDIA dibiarkan tersedia untuk model computer vision. Sisa kapasitas untuk
model belum dapat dipastikan sebelum model, resolusi input, jumlah kamera, dan
FPS inference sebenarnya diukur. Jika profil CPU kemudian menjadi hambatan,
decoder Intel iGPU/Quick Sync dapat dievaluasi terpisah setelah dukungan driver
dan build FFmpeg/OpenCV terbukti. Mengaktifkan akselerasi generik tanpa verifikasi
tidak membuktikan hardware decoder benar-benar dipakai.

[Dokumentasi OpenCV](https://docs.opencv.org/4.13.0/d4/d15/group__videoio__flags__base.html)
menjelaskan parameter akselerasi dan ketergantungan backend/build. Browser juga
memiliki pilihan backing canvas;
[dokumentasi MDN](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getContextAttributes)
menjelaskan atribut context aktual. Tidak ada klaim pengukuran persentase GPU
laptop berdasarkan hasil GPU server.

Kamera ID 35 tetap perlu pemeriksaan channel/URL/perangkat NVR: log RTSP masih
memuat `404 Not Found`. Kegagalan kamera itu sudah diisolasi agar tidak mereset
kamera sehat. Pemantauan yang dilakukan belum membuktikan stabilitas selama
berhari-hari atau saat model computer vision ditambahkan.
