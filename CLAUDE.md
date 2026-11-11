# CLAUDE.md

File ini berisi panduan bagi Claude Code (dan AI assistant lain) saat bekerja di repositori ini. Bacalah seluruhnya sebelum menulis kode.

## 1. Ringkasan Produk

**Z-Math** adalah aplikasi belajar **Bilangan Bulat** untuk siswa SMP Kelas VII. Aplikasi berjalan di **web (PWA)** dan **Android (Capacitor)**. Seluruh desainnya berlandaskan **Teori Beban Kognitif**. Target pengguna adalah siswa usia 12–14 tahun, sehingga semua teks UI harus memakai **Bahasa Indonesia yang sederhana**.

Sumber kebenaran:
- Kebutuhan produk: [docs/PRD.md](docs/PRD.md) (ID fitur `F-xx`)
- Prinsip pedagogis & kebijakan petunjuk: [docs/DESAIN-PEDAGOGIS.md](docs/DESAIN-PEDAGOGIS.md)
- Literasi matematika: [docs/LITERASI-MATEMATIKA.md](docs/LITERASI-MATEMATIKA.md)
- Mesin pemodelan soal cerita: [docs/PEMODELAN-SOAL-CERITA.md](docs/PEMODELAN-SOAL-CERITA.md)
- Komponen visual: [docs/VISUALISASI.md](docs/VISUALISASI.md)
- Konten dan format JSON: [docs/KURIKULUM-KONTEN.md](docs/KURIKULUM-KONTEN.md)
- Database: [docs/SKEMA-DATABASE.md](docs/SKEMA-DATABASE.md)
- API: [docs/API-SPEC.md](docs/API-SPEC.md)
- UI: [docs/UI-UX.md](docs/UI-UX.md)

Jika kode dan dokumen bertentangan, **tanyakan dulu kepada pengguna**. Jangan memilih salah satu secara diam-diam.

## 2. Tech Stack

| Lapisan | Teknologi |
|---|---|
| Frontend | React 18, Vite 6, TypeScript (strict), Tailwind CSS, React Router, Zustand, `vite-plugin-pwa` |
| Distribusi | **PWA** yang dipasang langsung dari browser (Android/Windows/Mac/iOS, tanpa toko aplikasi). Capacitor opsional di tahap lanjut |

> **Status Tahap 1:** belum ada Supabase. Progres siswa disimpan di perangkat (`frontend/src/store/progress.ts`), dan percobaan soal disimpan di memori server (`backend/app/services/attempts.py`). Konten ada di `backend/app/content/*.json`. Jika `frontend/dist` ada, backend juga menyajikan aplikasi web dari `:8000`.
| Backend | Python 3.12, FastAPI, Pydantic v2, `supabase-py`, `python-jose` (verifikasi JWT), Uvicorn |
| Database/Auth | Supabase (PostgreSQL 15, Supabase Auth, Row Level Security) |
| Test | Vitest + React Testing Library, Playwright (E2E), pytest + httpx |
| Lint/Format | ESLint + Prettier (frontend), Ruff + Black (backend) |

## 3. Struktur Repositori

```
/
├── CLAUDE.md
├── README.md
├── .env.example
├── docs/                    # Dokumen perencanaan (baca sebelum coding)
├── frontend/                # React + Vite + Capacitor
│   ├── src/
│   │   ├── app/             # router, provider, layout
│   │   ├── features/        # per fitur: auth, lessons, visuals, story-problem, practice, literacy, modeler, notes, teacher
│   │   ├── components/ui/   # komponen UI generik (Button, Card, ProgressBar)
│   │   ├── lib/             # apiClient, supabaseClient, util
│   │   ├── content/         # cache konten JSON offline
│   │   └── styles/
│   ├── android/             # dihasilkan oleh Capacitor, jangan diedit manual kecuali perlu
│   └── capacitor.config.ts
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/v1/          # router per resource
│   │   ├── core/            # config, security (verifikasi JWT Supabase)
│   │   ├── services/        # modeling/ (schema, instantiate, solver, equivalence, hint_generator, ...), grader, analytics
│   │   ├── schemas/         # model Pydantic
│   │   └── db/              # akses Supabase
│   └── tests/
└── supabase/
    ├── migrations/          # SQL migrasi (skema + RLS)
    └── seed/                # konten modul Bilangan Bulat (JSON/SQL)
```

## 4. Perintah

```bash
# Frontend (jalankan dari frontend/)
npm run dev            # server dev Vite :5173
npm run build          # build produksi ke dist/
npm run lint           # cek tipe TypeScript
npm run test           # Vitest
npm run icons          # buat ulang ikon PWA (python scripts/make_icons.py)

# Satu klik (Windows, dari root): jalankan.bat  |  mode dev: jalankan-dev.bat

# Backend (jalankan dari backend/ dengan venv aktif)
uvicorn app.main:app --reload    # API :8000, dokumentasi di /docs
pytest                           # unit + integration test
ruff check . && black --check .

# Supabase (jika memakai Supabase CLI lokal)
supabase start
supabase db reset                # terapkan migrasi + seed
```

## 5. Prinsip Desain Beban Kognitif (WAJIB)

Setiap fitur dan layar harus mematuhi aturan berikut. Aturan ini berasal langsung dari temuan wawancara (lihat [docs/RISET-WAWANCARA.md](docs/RISET-WAWANCARA.md)).

1. **Satu konsep per layar** (segmenting). Pelajaran dipecah menjadi segmen pendek. Satu segmen berisi paling banyak sekitar 60 kata teks.
2. **Tempo dikendalikan siswa** (EL3). Tidak boleh ada auto-advance, auto-play, atau timer yang memaksa. Selalu sediakan tombol "Lanjut" dan "Ulangi".
3. **Visual konkret lebih dulu, simbol kemudian** (EL2, K02). Setiap operasi bilangan bulat diperagakan dengan visual kontekstual (termometer, skala laut, lift, keping +/−, dll.) dan **garis bilangan** sebelum ditulis sebagai rumus. Semua visual memakai antarmuka `VisualScript` yang sama ([docs/VISUALISASI.md](docs/VISUALISASI.md)).
4. **Konsistensi warna (signaling).** Bilangan positif = biru (`--color-positive`), negatif = merah (`--color-negative`), nol = abu-abu. Jangan memakai warna ini untuk arti lain.
5. **Soal cerita selalu dipandu 4 langkah** (IL1, EL1): *Pahami (Diketahui) → Ditanya → Buat Model → Hitung (4a) & Tafsirkan (4b)*. Kata kunci kontekstual (mis. "di bawah permukaan laut", "turun", "utang") disorot dan dapat diketuk untuk melihat artinya. Soal cerita dibangun dari **skema semantik** ([docs/PEMODELAN-SOAL-CERITA.md](docs/PEMODELAN-SOAL-CERITA.md)), bukan teks hardcode.
6. **Worked example → faded example → latihan mandiri** (GL2, GL3, IL2). Jangan langsung memberi soal tanpa contoh.
7. **JANGAN PERNAH MEMBERIKAN JAWABAN LANGSUNG** (F-10). Tidak ada tombol "Lihat Jawaban". Bantuan diberikan lewat **3 tingkat petunjuk**: (1) Makna, (2) Visual tanpa posisi akhir, (3) Strategi/kerangka model dengan kotak kosong. Jika siswa masih kesulitan, tampilkan **Soal Kembar** (angka dan konteks berbeda), lalu **Antrean Ulang**. Pembahasan hanya muncul setelah siswa menjawab benar. `hint_generator` tidak boleh menerima hasil akhir sebagai input, dan setiap perubahan pada petunjuk wajib lolos test "tanpa bocor". Detail di [docs/DESAIN-PEDAGOGIS.md](docs/DESAIN-PEDAGOGIS.md) §6.
   Umpan balik per langkah menjelaskan *di mana* pikiran siswa keliru, dengan nada positif, tanpa menyebut jawaban benar.
8. **Hindari dekorasi yang tidak relevan** (*seductive details*): animasi atau gambar yang tidak menjelaskan konsep tidak boleh dipakai.
9. **Teks dan visual berdekatan** (*spatial contiguity*). Label diletakkan langsung pada gambar, bukan di keterangan terpisah.
10. **Bahasa sederhana.** Kalimat pendek (≤ 15 kata), kata sehari-hari, istilah baru selalu diberi penjelasan.
11. **Literasi matematika** (G5). Setiap soal cerita berakhir dengan penafsiran hasil dalam konteks dan pengecekan kewajaran. Setiap soal di bank soal wajib diberi tag `literacy` (indikator LM, proses PISA, level kognitif, konteks AKM). Lihat [docs/LITERASI-MATEMATIKA.md](docs/LITERASI-MATEMATIKA.md).

Jika sebuah permintaan melanggar aturan di atas, ingatkan pengguna sebelum mengerjakannya.

## 6. Konvensi Kode (ringkas, detail di [docs/KONVENSI-KODE.md](docs/KONVENSI-KODE.md))

- Kode, nama variabel, dan komentar ditulis dalam **bahasa Inggris**. Teks yang tampil ke pengguna ditulis dalam **Bahasa Indonesia** dan disimpan di `frontend/src/i18n/id.ts`, tidak di-hardcode di komponen.
- TypeScript `strict: true`, tanpa `any` kecuali ada komentar alasannya.
- Komponen React berupa fungsi dengan hooks. Satu komponen per file, nama file `PascalCase.tsx`.
- Python memakai type hints di semua fungsi publik. Skema request/response memakai Pydantic.
- Logika matematika (generator soal, penilai jawaban) adalah **fungsi murni** dan wajib memiliki unit test.
- Semua angka dalam soal yang dihasilkan otomatis harus dapat direproduksi dari `seed`.

## 7. Keamanan dan Privasi

- **Jangan pernah** meng-commit `.env`, service-role key Supabase, atau JWT secret.
- Frontend hanya memakai `SUPABASE_ANON_KEY`. Service-role key hanya ada di backend.
- Setiap tabel wajib mengaktifkan **RLS** (lihat [docs/SKEMA-DATABASE.md](docs/SKEMA-DATABASE.md)).
- Pengguna adalah anak di bawah umur. Kumpulkan data seminimal mungkin dan jangan menambah pelacak pihak ketiga atau iklan. Detail di [docs/KEAMANAN-PRIVASI.md](docs/KEAMANAN-PRIVASI.md).

## 8. Definition of Done

Sebuah tugas dianggap selesai jika:
- [ ] Kode lolos lint dan seluruh test.
- [ ] Ada test untuk logika baru (wajib untuk generator soal dan penilai).
- [ ] UI dicek pada lebar 360 px (Android kecil) dan desktop.
- [ ] Memenuhi prinsip pada Bagian 5.
- [ ] Teks UI ada di file i18n.
- [ ] Dokumen terkait di `docs/` diperbarui bila perilaku berubah.

## 9. Cara Bekerja yang Diharapkan

- Kerjakan sesuai urutan di [docs/ROADMAP.md](docs/ROADMAP.md).
- Sebutkan ID fitur (`F-xx`) di pesan commit dan PR.
- Buat perubahan kecil dan bertahap. Jalankan test sebelum menyatakan tugas selesai.
- Bila ragu soal aspek pedagogis, rujuk DESAIN-PEDAGOGIS.md. Jangan mengarang strategi baru tanpa konfirmasi.
