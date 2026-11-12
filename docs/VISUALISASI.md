# Katalog Visualisasi — Z-Math

Visual konkret adalah respons langsung terhadap temuan EL2 ("tidak ada contoh langsung, misal di garis bilangan") dan K02 (pembelajaran abstrak di papan tulis). Dokumen ini mendefinisikan **8 komponen visual** yang dipakai di pelajaran, soal cerita, petunjuk tingkat 2, dan Misi Literasi.

Fitur terkait: F-05 (Garis Bilangan), **F-19 (Visual Kontekstual)**.

## 1. Prinsip Umum

| Prinsip | Aturan |
|---|---|
| **Satu visual per soal** | Jangan menampilkan dua visual sekaligus (mengurangi *split-attention*) |
| **Konteks → visual yang sesuai** | Soal suhu memakai termometer, soal penyelam memakai skala laut. Garis bilangan menjadi jembatan ke bentuk abstrak |
| **Warna konsisten** | Positif = biru, negatif = merah, nol = abu-abu, di **semua** visual |
| **Gerak per ketukan** | Animasi hanya berjalan saat siswa mengetuk "Langkah berikutnya", tanpa auto-play |
| **Label menempel** | Angka ditulis langsung di visual |
| **Tidak membocorkan jawaban** | Pada mode petunjuk, posisi akhir tidak diberi label (lihat §4) |
| **Jembatan ke garis bilangan** | Setiap visual vertikal (termometer, laut, gedung) dapat "diputar" menjadi garis bilangan horizontal dengan tombol "Lihat sebagai garis bilangan" (*concreteness fading*) |
| **Ringan** | SVG murni, < 30 KB per komponen, ≥ 50 fps di HP low-end |
| **Aksesibel** | `role="img"` + `aria-label` yang menjelaskan keadaan ("Termometer menunjukkan minus 2 derajat") |

## 2. Daftar Komponen

### 2.1 Garis Bilangan (`NumberLine`)
- **Konteks**: abstrak, posisi, maju–mundur.
- **Operasi**: semua penjumlahan/pengurangan, perbandingan, urutan, lawan bilangan.
- **Interaksi**: geser titik, ketuk panah untuk melompat, zoom rentang.
- Spesifikasi detail ada di [UI-UX.md](UI-UX.md) §5.

### 2.2 Termometer (`Thermometer`)
```
   °C
   10 ┤
    5 ┤
    0 ┼── ← nol (garis tebal abu-abu)
   −2 ┤██ ← posisi awal (merah, di bawah nol)
   −5 ┤██
  −10 ┤██
      (●)
```
- **Konteks**: suhu (kenaikan, penurunan, selisih antarkota, rata-rata).
- **Operasi**: CHG, CMP, RPT, AVG.
- **Interaksi**: seret permukaan cairan, atau ketuk ▲/▼ per 1 °C. Saat naik, panah biru dengan label "+5". Saat turun, panah merah dengan label "−3".
- **Mode perbandingan**: dua termometer berdampingan, dengan kurung selisih di antaranya (untuk CMP).
- **Warna cairan**: biru di atas nol, merah di bawah nol (sesuai konvensi tanda, bukan konvensi panas/dingin; dijelaskan sekali di pelajaran M1.1).
- **Rentang default**: −20..40 °C.

### 2.3 Skala Laut / Penyelam (`SeaDepth`)
```
  ☁️  langit
 ─────────── 0 m  permukaan laut
  🤿  −2 m
       ↓ −3
  🤿  −5 m
 ▓▓▓▓▓▓▓▓▓▓ dasar laut
```
- **Konteks**: kedalaman, penyelam, kapal selam, burung yang menyelam.
- **Operasi**: CHG, CMP.
- **Interaksi**: penyelam digeser naik/turun. Garis permukaan laut = 0 selalu terlihat.
- Diangkat langsung dari soal pemantik wawancara (Buku Siswa Kelas VII, Contoh 1.5).

### 2.4 Profil Ketinggian (`Elevation`)
- **Konteks**: ketinggian gunung (mdpl), kedalaman palung, selisih ketinggian tempat.
- **Operasi**: CMP (selisih puncak dan dasar laut), urutan.
- **Tampilan**: siluet gunung di atas garis laut dan palung di bawahnya, dengan skala vertikal (dapat berskala 100/1.000).

### 2.5 Gedung & Lift (`Elevator`)
```
 ┌───┐ 3
 ├───┤ 2
 ├───┤ 1   ▲ +3
 ├═══┤ 0   lantai dasar
 ├───┤ −1  basement 1
 ├───┤ −2  basement 2 ◀ 🛗
 └───┘
```
- **Konteks**: lift mal atau apartemen, tempat parkir basement.
- **Operasi**: CHG, MLT (naik-turun beberapa kali).
- **Interaksi**: ketuk lantai tujuan atau tombol ▲/▼. Jejak perjalanan ditampilkan sebagai panah berwarna.

### 2.6 Keping Positif–Negatif (`Counters`)
```
  ⊕ ⊕ ⊕ ⊕ ⊕      (+5)
  ⊖ ⊖ ⊖          (−3)
  ──────────
  pasangan nol: ⊕⊖ ⊕⊖ ⊕⊖  → hilang
  sisa: ⊕ ⊕       = +2
```
- **Konteks**: abstrak, untuk konsep operasi (M3, M4).
- **Operasi**: penjumlahan (gabung), pengurangan (ambil; tambah **pasangan nol** bila kurang), perkalian (kelompok berulang), pembagian (bagi rata).
- **Interaksi**: seret keping ke area kerja. Ketuk "Hapus pasangan nol" untuk menghapus ⊕⊖.
- Sangat penting untuk menjelaskan **mengapa** 4 − (−2) = 6 (miskonsepsi `sub_negative`).

### 2.7 Dompet / Batang Saldo (`Wallet`)
- **Konteks**: uang jajan, untung–rugi, utang–piutang, tabungan.
- **Operasi**: CMB, CHG, PRT.
- **Tampilan**: batang vertikal dengan garis 0. Saldo positif digambarkan sebagai batang biru ke atas, utang sebagai batang merah ke bawah. Setiap transaksi ditampilkan sebagai segmen bertumpuk.
- **Mode bagi rata**: batang utang dipotong menjadi *n* bagian sama.

### 2.8 Papan Skor (`Scoreboard`)
- **Konteks**: kuis atau olimpiade (benar +4, salah −1, kosong 0), pertandingan.
- **Operasi**: SCR, CMB.
- **Tampilan**: tabel ikon ✔/✘/○ dengan nilai per jenis, dikalikan jumlahnya, lalu dijumlahkan.

### 2.9 Grafik Garis Data (`DataLineChart`), untuk Misi Literasi
- **Konteks**: suhu harian atau mingguan, saldo dari waktu ke waktu.
- **Operasi**: membaca data (LM3), selisih, rata-rata, kenaikan/penurunan terbesar.
- **Tampilan**: sumbu-y melewati 0 dengan garis nol tebal, titik positif biru dan negatif merah.

### 2.10 Mobil di Garis Bilangan (`NumberLineWalker`) — usulan, komponen siap
Operasi `a + b` dan `a − b` sebagai mobil yang menghadap kanan (+) atau berbalik ke kiri (−), lalu maju (bilangan kedua positif) atau mundur (negatif). Siswa mengatur soal, menebak, lalu menjalankan mobil satu langkah per ketukan. Logika murni di `features/visuals/walk.ts`. Spesifikasi lengkap: [RANCANGAN-BELAJAR-MANDIRI.md](RANCANGAN-BELAJAR-MANDIRI.md) §2.2.

## 3. Antarmuka Komponen yang Seragam

Semua visual menerima **skrip visual** yang sama dari backend (`visual_script.py`), sehingga mudah ditukar:

```ts
type VisualKind =
  | 'number_line' | 'thermometer' | 'sea_depth' | 'elevation'
  | 'elevator' | 'counters' | 'wallet' | 'scoreboard' | 'data_line_chart';

type VisualScript = {
  kind: VisualKind;
  range?: [number, number];
  unit?: string;                 // "°C", "m", "lantai", "Rp"
  start: number | null;          // null = "?" (tidak diketahui)
  // op '?' + value null = arah/besar perubahan disembunyikan (mode 'hint')
  steps: Array<{ op: '+' | '-' | 'x' | ':' | '?'; value: number | null; label?: string }>;
  showEnd: boolean;              // false pada mode petunjuk
  mode: 'explore' | 'guided' | 'hint' | 'answer' | 'review';
  compareWith?: number;          // mode perbandingan (CMP)
};

type VisualProps = {
  script: VisualScript;
  onStep?: (index: number) => void;      // dipanggil tiap ketukan
  onAnswer?: (value: number) => void;    // mode 'answer': siswa menunjuk hasil
};
```

Lokasi kode: `frontend/src/features/visuals/<Nama>.tsx`, dengan registry `visuals/index.ts` yang memetakan `kind` ke komponen.

## 4. Mode Visual

| Mode | Dipakai di | Posisi akhir terlihat? |
|---|---|---|
| `explore` | Segmen eksplorasi pelajaran | Ya, siswa bebas bereksperimen |
| `guided` | Worked example | Ya, diperagakan langkah demi langkah |
| `hint` | **Petunjuk tingkat 2** | **Tidak**: hanya posisi awal dan arah/besar perubahan |
| `answer` | Siswa menjawab dengan menunjuk di visual | Siswa yang menentukan |
| `review` | Pembahasan **setelah** siswa menjawab benar | Ya |

## 5. Pemetaan Visual ke Modul

| Modul | Visual utama | Visual pendukung |
|---|---|---|
| M1 Mengenal Bilangan Bulat | Termometer, Gedung & Lift, Skala Laut | Garis bilangan |
| M2 Membandingkan & Mengurutkan | Garis bilangan, Termometer (perbandingan) | Profil ketinggian |
| M3 Penjumlahan & Pengurangan | Garis bilangan, Keping +/− | Termometer, Lift |
| M4 Perkalian & Pembagian | Keping +/− (kelompok) | Termometer (RPT), Dompet (PRT) |
| M5 Sifat Operasi | Keping +/− | Garis bilangan |
| M6 Soal Cerita | Sesuai konteks (§2) | Garis bilangan (jembatan) |
| Misi Literasi | Grafik data, tabel | Sesuai konteks |

## 6. Urutan Implementasi
1. `NumberLine` (Sprint 2): fondasi, semua visual lain dapat dikonversi ke sini.
2. `Thermometer`, `Counters` (Sprint 2–3).
3. `SeaDepth`, `Elevator` (Sprint 3).
4. `Wallet`, `Scoreboard`, `Elevation`, `DataLineChart` (Sprint 4).
