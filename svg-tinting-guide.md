# SVG Tinting dengan feColorMatrix

> Panduan lengkap mewarnai SVG (putih/raster-embedded) menggunakan SVG `<filter>` + `<feColorMatrix>` — tanpa kehilangan detail.

---

## Daftar Isi

1. [Latar Belakang](#latar-belakang)
2. [Teori Dasar](#teori-dasar)
3. [Perbandingan Pendekatan](#perbandingan-pendekatan)
4. [Cara Kerja feColorMatrix](#cara-kerja-fecolormatrix)
5. [Implementasi di Project](#implementasi-di-project)
6. [Panduan Fine-Tuning Warna](#panduan-fine-tuning-warna)
7. [Resep Warna Siap Pakai](#resep-warna-siap-pakai)
8. [Troubleshooting](#troubleshooting)

---

## Latar Belakang

Di project ini, asset motor (`motor.svg`) berisi **gambar PNG raster yang di-embed di dalam SVG** (base64-encoded). Gambar aslinya berwarna **putih** dengan detail gelap (nameplate, shading) dan background transparan.

**Tujuan:** Mewarnai motor menjadi merah (stop/default) atau hijau (running) dengan:
- Warna yang vivid dan akurat
- Detail internal (nameplate, shading) tetap terlihat
- Background tetap transparan

---

## Teori Dasar

### Luminance (Kecerahan)

Luminance mengukur seberapa "terang" suatu pixel menurut persepsi mata manusia. Rumus standar (ITU-R BT.709):

```
L = 0.2126 × R + 0.7152 × G + 0.0722 × B
```

| Warna Asli | R | G | B | Luminance |
|---|---|---|---|---|
| Putih | 255 | 255 | 255 | 255 (max terang) |
| Abu-abu | 128 | 128 | 128 | 128 (mid-tone) |
| Hitam | 0 | 0 | 0 | 0 (gelap total) |

**Koefisien:**
- Hijau (0.7152) punya pengaruh terbesar — mata manusia paling sensitif terhadap hijau
- Merah (0.2126) pengaruh menengah
- Biru (0.0722) pengaruh terkecil
- Jumlah ketiga koefisien = 1.0

### Alpha Channel (Transparansi)

Setiap pixel punya nilai alpha:
- `1` = opaque (terlihat penuh)
- `0` = transparan (tidak terlihat)
- `0-1` = semi-transparan

SVG motor kita: body & nameplate = opaque (alpha 1), background = transparan (alpha 0).

### feColorMatrix

`<feColorMatrix>` adalah filter SVG yang mengalikan setiap pixel dengan sebuah matriks 4×5:

```
| R_baru |   | a  b  c  d  e |   | R_asli |
| G_baru | = | f  g  h  i  j | × | G_asli |
| B_baru |   | k  l  m  n  o |   | B_asli |
| A_baru |   | p  q  r  s  t |   | A_asli |
                                         | 1      |
```

Rumus lengkap:
```
R_baru = a×R + b×G + c×B + d×A + e
G_baru = f×R + g×G + h×B + i×A + j
B_baru = k×R + l×G + m×B + n×A + o
A_baru = p×R + q×G + r×B + s×A + t
```

---

## Perbandingan Pendekatan

### Pendekatan 1: CSS Filter Chain (TIDAK DIREKOMENDASIKAN)

```css
filter: invert(1) brightness(1.5) sepia(1) saturate(6) hue-rotate(-40deg);
```

**Masalah:**
- `invert(1)` mengubah pixel gelap (nameplate) jadi terang → detail hilang
- Semua pixel diperlakukan sama, tidak peduli terang/gelap
- Warna sulit diprediksi, banyak trial & error
- `brightness(0)` membuat semua pixel hitam → flat tanpa detail

### Pendekatan 2: CSS Multiply Blend (KURANG BAIK)

```jsx
<rect fill="red" opacity={0.65} style={{ mixBlendMode: "multiply" }} />
```

**Masalah:**
- Warna putih asli masih terlihat menembus overlay
- Hasil terlihat "pucat" / tidak saturated

### Pendekatan 3: SVG feColorMatrix (DIREKOMENDASIKAN)

```xml
<filter id="tint-red">
  <feColorMatrix type="matrix" values="..." />
</filter>
```

**Keunggulan:**
- Kontrol per-channel (R, G, B, A) secara matematis
- Luminance-preserving: pixel terang → warna cerah, pixel gelap → tetap gelap
- Alpha channel tetap utuh: background transparan tidak terpengaruh
- Warna akurat dan dapat diprediksi

---

## Cara Kerja feColorMatrix

### Konsep: Luminance-to-Color Mapping

Ide dasarnya: **gunakan luminance asli sebagai "volume knob"** untuk warna target.

```
Pixel terang (body)     → Luminance tinggi → Warna target cerah
Pixel gelap (nameplate) → Luminance rendah → Warna target gelap
Transparan (background) → Alpha 0         → Tetap transparan
```

### Matriks untuk Merah (#FF0000)

```
R_baru = 0.244×R + 0.822×G + 0.083×B   ← luminance × 1.15 (lebih terang)
G_baru = 0                               ← selalu 0
B_baru = 0                               ← selalu 0
A_baru = A_asli                          ← alpha tidak berubah
```

**Hasil per pixel:**

| Pixel Asli | R_baru | G_baru | B_baru | A_baru | Hasil |
|---|---|---|---|---|---|
| Putih (255,255,255,1) | 293→255 | 0 | 0 | 1 | **#FF0000** merah murni |
| Abu (128,128,128,1) | 147 | 0 | 0 | 1 | **#930000** merah gelap |
| Gelap (60,60,60,1) | 69 | 0 | 0 | 1 | **#450000** sangat gelap |
| Transparan (0,0,0,0) | 0 | 0 | 0 | 0 | tetap transparan |

> Catatan: nilai > 255 di-clamp ke 255. `0.244+0.822+0.083 = 1.149` artinya 15% lebih terang dari luminance standar, membuat area terang sedikit "blown out" ke merah penuh.

### Matriks untuk Hijau

```
R_baru = 0.0638×R + 0.2146×G + 0.0216×B   ← sedikit merah untuk natural
G_baru = 0.2551×R + 0.8582×G + 0.0867×B   ← channel utama hijau
B_baru = 0.0425×R + 0.1430×G + 0.0144×B   ← sedikit biru
A_baru = A_asli
```

**Hasil per pixel:**

| Pixel Asli | R_baru | G_baru | B_baru | Hasil |
|---|---|---|---|---|
| Putih (255,255,255,1) | 76 | 306→255 | 51 | **#4CFF33** hijau vivid |
| Abu (128,128,128,1) | 38 | 153 | 25 | hijau gelap |
| Gelap (60,60,60,1) | 18 | 72 | 12 | hijau sangat gelap |

---

## Implementasi di Project

### 1. Definisikan Filter di SVG Canvas

Tambahkan `<defs>` dengan filter definitions di dalam SVG canvas utama:

```jsx
<svg viewBox="0 0 1920 1080">
  <defs>
    <filter id="tint-red">
      <feColorMatrix type="matrix"
        values="0.244 0.822 0.083 0 0
                0     0     0     0 0
                0     0     0     0 0
                0 0 0 1 0"/>
    </filter>
    <filter id="tint-green">
      <feColorMatrix type="matrix"
        values="0.0638 0.2146 0.0216 0 0
                0.2551 0.8582 0.0867 0 0
                0.0425 0.1430 0.0144 0 0
                0 0 0 1 0"/>
    </filter>
  </defs>
  {/* ... konten SVG lainnya ... */}
</svg>
```

### 2. Gunakan di Component

```jsx
const EquipmentImageSVG = ({ src, x, y, width, height, isRunning, onClick }) => {
  // Pilih filter berdasarkan status
  const filter = isRunning === null
    ? undefined
    : isRunning
      ? "url(#tint-green)"   // Running = hijau
      : "url(#tint-red)";    // Stop    = merah

  return (
    <g onClick={onClick}>
      <image
        href={src}
        x={x} y={y}
        width={width} height={height}
        style={{ filter }}
      />
    </g>
  );
};
```

### 3. Terapkan ke Elemen

```jsx
<EquipmentImageSVG
  src={motorSvg}
  x={150} y={705}
  width={110} height={115}
  isRunning={motorRunning}
  onClick={() => setMotorRunning(prev => !prev)}
/>
```

### 4. State Toggle (untuk demo)

```jsx
const [motorRunning, setMotorRunning] = useState(false);
// false → merah (default), true → hijau
```

---

## Panduan Fine-Tuning Warna

### Mengontrol Kecerahan

Jumlah koefisien luminance (baris utama) menentukan kecerahan:

| Jumlah | Efek | Contoh |
|---|---|---|
| `= 1.0` | Luminance standar | `0.2126 + 0.7152 + 0.0722 = 1.0` |
| `> 1.0` | Lebih terang | `0.244 + 0.822 + 0.083 = 1.149` (+15%) |
| `< 1.0` | Lebih gelap | `0.170 + 0.572 + 0.058 = 0.8` (-20%) |
| `>> 1.0` | Washed out / terlalu terang | Hindari > 1.5 |

### Mengontrol Warna Target

**Untuk warna merah:**
- Row R = luminance coefficients (bisa di-scale)
- Row G = semua 0
- Row B = semua 0

**Untuk warna hijau:**
- Row R = luminance × 0.25 (sedikit merah)
- Row G = luminance × 3.0+ (channel utama)
- Row B = luminance × 0.2 (sedikit biru)

**Untuk warna biru:**
- Row R = luminance × 0.1
- Row G = luminance × 0.3
- Row B = luminance × 2.5+

**Untuk warna kuning:**
- Row R = luminance × 1.0+
- Row G = luminance × 1.0+
- Row B = semua 0

### Mengontrol Kontras

Kolom ke-5 (constant offset) menambahkan nilai ke semua pixel:
```
R_baru = lum×R + ... + OFFSET
```
- `OFFSET > 0`: area gelap jadi lebih terang (mengurangi kontras)
- `OFFSET = 0`: kontras natural (direkomendasikan)
- `OFFSET < 0`: area terang jadi lebih gelap (meningkatkan kontras)

---

## Resep Warna Siap Pakai

### Merah Murni (#FF0000)
```
0.2126 0.7152 0.0722 0 0
0      0      0      0 0
0      0      0      0 0
0 0 0 1 0
```

### Merah Terang (+15%)
```
0.244 0.822 0.083 0 0
0     0     0     0 0
0     0     0     0 0
0 0 0 1 0
```

### Hijau Vivid
```
0.0638 0.2146 0.0216 0 0
0.2551 0.8582 0.0867 0 0
0.0425 0.1430 0.0144 0 0
0 0 0 1 0
```

### Biru
```
0.0213 0.0715 0.0072 0 0
0.0425 0.1430 0.0144 0 0
0.4252 1.4304 0.1444 0 0
0 0 0 1 0
```

### Kuning
```
0.2126 0.7152 0.0722 0 0
0.2126 0.7152 0.0722 0 0
0      0      0      0 0
0 0 0 1 0
```

### Orange
```
0.2551 0.8582 0.0867 0 0
0.1276 0.4291 0.0433 0 0
0      0      0      0 0
0 0 0 1 0
```

### Rumus Cepat untuk Warna Kustom

Untuk membuat warna target `(Rt, Gt, Bt)`:

```
Row R = Rt/255 × [0.2126, 0.7152, 0.0722, 0, 0]
Row G = Gt/255 × [0.2126, 0.7152, 0.0722, 0, 0]
Row B = Bt/255 × [0.2126, 0.7152, 0.0722, 0, 0]
Row A = [0, 0, 0, 1, 0]
```

Contoh untuk warna ungu `(128, 0, 255)`:
```
Row R = 128/255 × [0.2126, 0.7152, 0.0722] = [0.1067, 0.3590, 0.0362]
Row G = 0/255   × [...]                     = [0, 0, 0]
Row B = 255/255 × [0.2126, 0.7152, 0.0722] = [0.2126, 0.7152, 0.0722]
Row A = [0, 0, 0, 1, 0]
```

---

## Troubleshooting

### Warna terlalu gelap / terlalu terang
→ Sesuaikan jumlah koefisien di row utama. Naikkan untuk lebih terang, turunkan untuk lebih gelap.

### Detail (nameplate) ikut berwarna
→ Pastikan row G dan B di-set ke 0 untuk warna merah murni. Kalau detail masih terpengaruh, berarti pixel detail di gambar aslinya cukup terang — pertimbangkan edit gambar sumber.

### Background ikut berwarna
→ Pastikan row A = `[0, 0, 0, 1, 0]` agar alpha channel tidak berubah. Background transparan (alpha=0) akan tetap transparan.

### Filter tidak bekerja
→ Pastikan `<filter>` didefinisikan di dalam `<defs>` pada SVG canvas yang sama dengan elemen yang menggunakannya. Filter ID harus match (`url(#tint-red)`).

### Warna berbeda di browser lain
→ `feColorMatrix` adalah standar SVG dan didukung semua browser modern (Chrome, Firefox, Safari, Edge). Jika ada perbedaan, biasanya karena color space (sRGB vs linearRGB). Tambahkan `color-interpolation-filters="sRGB"` pada `<filter>`.

### Gambar SVG berisi raster (base64 PNG)
→ Pendekatan ini tetap bekerja karena `feColorMatrix` beroperasi pada **pixel yang sudah di-render**, bukan pada vektor path. Ini justru keuntungan — bekerja sama baiknya untuk vektor maupun raster.

---

## Referensi Commit

State finalized tersimpan di git commit:
```
git checkout 11b8115
```

File yang relevan:
- `src/OilClarificationPage.jsx` — component `EquipmentImageSVG` + filter definitions
- `src/assets/motor.svg` — asset motor (raster-embedded)
