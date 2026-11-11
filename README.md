# Z-Math — Aplikasi Belajar Bilangan Bulat untuk Siswa SMP

> Sebelumnya bernama kerja "BulatKu". Nama aplikasi sekarang **Z-Math**.

**Z-Math** adalah aplikasi belajar matematika berbasis web dan Android untuk siswa SMP/MTs. Rilis pertama (MVP) membahas materi **Bilangan Bulat (Kelas VII)**. Desainnya mengikuti **Teori Beban Kognitif** (*Cognitive Load Theory*), dengan tiga tujuan:

- menurunkan **beban ekstrinsik**, yaitu beban dari bahasa soal yang membingungkan, penjelasan yang terlalu cepat, dan tidak adanya visual konkret;
- mengelola **beban intrinsik** dengan memecah materi secara bertahap dan memeriksa prasyarat;
- mendorong **beban germane** melalui contoh yang dikerjakan (*worked example*), catatan pribadi, dan latihan berpola.

Aplikasi ini juga **menumbuhkembangkan literasi matematika** (kerangka PISA & AKM). Caranya: memodelkan berbagai jenis soal cerita ke dalam model matematika, menyelesaikannya langkah demi langkah, dan menafsirkan hasilnya. Soal disajikan dengan **visual kontekstual** (termometer, skala laut, lift, keping +/−, dll.), dan **jawaban tidak pernah diberikan langsung**. Siswa dibimbing dengan **petunjuk 3 tingkat** (Makna → Visual → Strategi).

Kebutuhan produk ini berasal dari wawancara dengan siswa kelas VIII (06 November 2026) yang dilakukan oleh Maspupatul Hasanah (NIM 2225250050).

---

## Peta Dokumen

| Dokumen | Untuk apa |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Panduan kerja untuk Claude Code / AI assistant saat membangun aplikasi |
| [docs/PRD.md](docs/PRD.md) | *Product Requirements Document*: apa yang dibangun dan alasannya |
| [docs/RISET-WAWANCARA.md](docs/RISET-WAWANCARA.md) | Sintesis hasil wawancara dan matriks keterlacakan temuan → fitur |
| [docs/DESAIN-PEDAGOGIS.md](docs/DESAIN-PEDAGOGIS.md) | Landasan teori beban kognitif dan strategi pembelajaran |
| [docs/LITERASI-MATEMATIKA.md](docs/LITERASI-MATEMATIKA.md) | Kerangka literasi matematika (PISA & AKM), indikator, Misi Literasi |
| [docs/PEMODELAN-SOAL-CERITA.md](docs/PEMODELAN-SOAL-CERITA.md) | Mesin pemodelan soal cerita: jenis soal → model → penyelesaian + petunjuk |
| [docs/VISUALISASI.md](docs/VISUALISASI.md) | Katalog visual: garis bilangan, termometer, skala laut, lift, keping +/−, dll. |
| [docs/KURIKULUM-KONTEN.md](docs/KURIKULUM-KONTEN.md) | Silabus modul Bilangan Bulat dan format konten |
| [docs/ARSITEKTUR.md](docs/ARSITEKTUR.md) | Arsitektur sistem, struktur folder, alur autentikasi |
| [docs/SKEMA-DATABASE.md](docs/SKEMA-DATABASE.md) | ERD, definisi tabel, dan *Row Level Security* |
| [docs/API-SPEC.md](docs/API-SPEC.md) | Spesifikasi REST API backend FastAPI |
| [docs/UI-UX.md](docs/UI-UX.md) | Prinsip antarmuka, sitemap, dan wireframe |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Jadwal sprint, milestone, dan deliverable |
| [docs/TESTING-EVALUASI.md](docs/TESTING-EVALUASI.md) | Strategi pengujian perangkat lunak dan evaluasi pembelajaran |
| [docs/KEAMANAN-PRIVASI.md](docs/KEAMANAN-PRIVASI.md) | Perlindungan data siswa (anak di bawah umur) |
| [docs/KONVENSI-KODE.md](docs/KONVENSI-KODE.md) | Gaya kode, alur git, *Definition of Done* |
| [.env.example](.env.example) | Contoh variabel lingkungan |

## Ringkasan Teknologi

| Lapisan | Teknologi |
|---|---|
| Frontend | React 18 + Vite 6 + TypeScript + Tailwind CSS + Zustand (PWA) |
| Distribusi | PWA, bisa dipasang di Android, Windows, Mac, dan iOS tanpa toko aplikasi. Capacitor/APK opsional nanti |
| Backend | Python 3.12 + FastAPI |
| Database & Auth | Supabase (PostgreSQL + Supabase Auth) |
| Pengujian | Vitest, React Testing Library, Playwright, pytest |

## Menjalankan Aplikasi

**Cara termudah (Windows):** klik dua kali `jalankan.bat`. Skrip ini menyiapkan Python dan paket JavaScript (sekali saja), membangun aplikasi web, lalu membuka `http://localhost:8000`. Satu server menyajikan API sekaligus aplikasinya.

Cara manual:

```bash
# Backend (Python) — dari folder backend/
python -m venv .venv
.venv\Scripts\activate                 # Windows  (Mac/Linux: source .venv/bin/activate)
pip install -r requirements.txt
pytest                                 # 107 test, termasuk test "petunjuk tanpa bocor"

# Frontend (JavaScript) — dari folder frontend/
npm install
npm run build                          # hasil di frontend/dist (PWA)
npm test

# Jalankan (dari backend/) — menyajikan API + aplikasi web
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Mode pengembangan (perubahan kode langsung terlihat): `jalankan-dev.bat`, atau jalankan `uvicorn app.main:app --reload` dan `npm run dev` (http://localhost:5173) di dua terminal.

## Memasang di Perangkat (tanpa Play Store / App Store)

Z-Math adalah **PWA (Progressive Web App)**. Aplikasi dibuka di browser lalu dipasang ke layar utama:

| Perangkat | Cara memasang |
|---|---|
| Android | Buka di Chrome → tombol **Pasang Aplikasi** di aplikasi, atau menu ⋮ → *Instal aplikasi* |
| Windows / Mac | Buka di Chrome atau Edge → ikon pasang di bilah alamat, atau tombol **Pasang Aplikasi** |
| iPhone / iPad | Buka di **Safari** → tombol Bagikan → *Tambahkan ke Layar Utama* |

> **Penting:** browser hanya mengizinkan pemasangan dari alamat **HTTPS** (kecuali `localhost`). Di komputer sendiri bisa langsung dicoba. Agar siswa bisa memasangnya dari HP, aplikasi perlu di-*deploy* ke hosting ber-HTTPS (mis. Render atau Railway). Sebelum itu, HP di Wi-Fi yang sama tetap bisa membuka `http://IP-KOMPUTER:8000` di browser, hanya belum bisa dipasang.

## Status — Tahap 1 (MVP awal)

✅ **Sudah berjalan:**
- 8 pelajaran (M1, M3, M6) dengan pemantik, eksplorasi visual, contoh lengkap, dan rangkuman
- 15 templat soal dari 8 jenis soal (termasuk 3 posisi bilangan yang dicari pada soal perubahan), dengan angka acak yang dapat direproduksi
- Pemandu soal cerita 4 langkah + tafsirkan, petunjuk 3 tingkat tanpa jawaban, Soal Kembar, dan Antrean Ulang
- Visual: garis bilangan, termometer, skala laut, gedung & lift
- Profil: progres per modul, hari aktif, statistik
- PWA yang bisa dipasang dan bisa dibuka saat offline (materi yang sudah dibuka)

⏳ **Tahap berikutnya** (lihat [docs/ROADMAP.md](docs/ROADMAP.md)):
- Login dan database Supabase, sehingga progres tersinkron dan dasbor guru tersedia
- Misi Literasi
- Visual dompet, papan skor, dan grafik data
- Modul M0, M2, M4, M5
- Deploy ke hosting HTTPS

Perbedaan Tahap 1 dari rencana awal:
- Progres disimpan di perangkat (mode tamu) dan percobaan soal disimpan di memori server. Supabase belum dipakai.
- Aplikasi dibagikan sebagai PWA, bukan APK Capacitor. Ini sesuai permintaan agar bisa dipasang di Android, Windows, Mac, dan iOS tanpa toko aplikasi.
