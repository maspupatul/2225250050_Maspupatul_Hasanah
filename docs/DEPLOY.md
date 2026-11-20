# Deploy ℤ-Math: Netlify + Vercel + Supabase

Tanpa kartu kredit. Tiga layanan gratis:

| Bagian | Layanan | Isi |
|---|---|---|
| Aplikasi web (React PWA) | **Netlify** | Folder `frontend/`, konfigurasi `netlify.toml` di akar repo |
| API (FastAPI) | **Vercel** (Python Function) | Folder `backend/`, konfigurasi `backend/vercel.json`. Vercel menemukan `app` di `backend/app/main.py` secara otomatis |
| Database | **Supabase** (PostgreSQL) | Tabel dibuat otomatis oleh backend saat pertama berjalan |

```
Browser ──► Netlify (ℤ-Math)  ──/api/*──►  Vercel (FastAPI)  ──►  Supabase PostgreSQL
              │  halaman, PWA                 serverless            pooler port 6543
              └─ satu alamat untuk siswa: tidak perlu pengaturan CORS
```

Backend serverless menyimpan semua keadaan di database, bukan di memori server: percobaan soal (`practice_attempts`) dan penghitung salah login (`login_failures`). Jadi setiap permintaan boleh dilayani instans Vercel yang berbeda.

## 1. Supabase (database)

1. Buat proyek di [supabase.com](https://supabase.com). Simpan kata sandi database.
2. **Project Settings → Database → Connection string → Transaction pooler** (port **6543**). Salin URL-nya dan ganti `[YOUR-PASSWORD]` **termasuk tanda kurungnya**: `…:rahasia@…`, bukan `…:[rahasia]@…`. Jika kata sandi memuat karakter khusus (`@ : / ? # % & + =` dan sejenisnya), tulis dalam bentuk *URL-encoded* (mis. `@` → `%40`, `#` → `%23`), atau buat ulang kata sandi yang hanya berisi huruf dan angka. Gejala jika keliru: `password authentication failed for user "postgres"`.
3. URL ini rahasia. Simpan hanya di Environment Variables Vercel dan (jika perlu) `backend/.env`. Jangan ditempel di chat atau di file yang ikut git.

Backend mengubah `postgres://`/`postgresql://` menjadi `postgresql+psycopg://`, memakai SSL (`sslmode=require`), dan mematikan *prepared statement* agar cocok dengan pooler mode transaksi.

Tabel (`users`, `classes`, `student_progress`, `practice_attempts`, `login_failures`) dibuat otomatis saat backend pertama kali berjalan. Kolom baru juga ditambahkan otomatis.

## 2. Vercel (backend)

1. [vercel.com](https://vercel.com) → **Add New → Project** → impor repo GitHub ini.
2. **Root Directory: `backend`**. Framework Preset: **FastAPI** (biasanya terdeteksi otomatis dari `requirements.txt`). Build Command, Output Directory, dan Install Command dibiarkan bawaan. Vercel memakai objek `app` di `app/main.py`.
3. **Environment Variables** (Production):

| Nama | Isi |
|---|---|
| `DATABASE_URL` | URL Supabase port 6543 (langkah 1) |
| `ZMATH_JWT_SECRET` | Rahasia acak panjang, mis. hasil `python -c "import secrets; print(secrets.token_urlsafe(48))"`. **Wajib** (tanpa ini backend menolak berjalan di Vercel) |
| `ZMATH_TEACHER_CODE` | Kode pendaftaran guru dari admin sekolah |
| `GEMINI_API_KEY` | Kunci Gemini (Smart Hint & Tanya Asisten). Kosong = petunjuk statis saja |
| `ZMATH_SEED_DEMO` | `0` (bawaan di Vercel). Isi `1` hanya untuk demo sementara: akun demo punya kata sandi yang diketahui umum |

4. **Deploy**. Cek: `https://<proyek>.vercel.app/health` → `{"status":"ok"}`, dan `https://<proyek>.vercel.app/api/v1/modules` → daftar modul.

Catatan:
- Python 3.12 (`backend/.python-version`). Vercel memasang paket dari daftar `dependencies` di `backend/pyproject.toml` (bukan `requirements.txt`, karena `pyproject.toml` didahulukan). Daftar ini harus sama dengan paket aplikasi di `requirements.txt`; `tests/test_deploy.py` memeriksanya. Gejala jika kosong: build hanya beberapa detik, lalu log `ModuleNotFoundError: No module named 'fastapi'`.
- Batas waktu fungsi 60 detik (`vercel.json`). Tanya Asisten menunggu Gemini paling lama 20 detik, Smart Hint 12 detik.
- Permintaan pertama setelah lama tidak dipakai lebih lambat beberapa detik (*cold start*).
- `CORS_ORIGINS` tidak perlu diisi selama aplikasi dibuka lewat alamat Netlify (lewat proxy).

## 3. Netlify (frontend)

1. Buka `netlify.toml` di akar repo. Ganti `GANTI-DENGAN-BACKEND-VERCEL` dengan alamat Vercel dari langkah 2, contoh:
   ```toml
   to = "https://zmath-api.vercel.app/api/:splat"
   ```
   Commit dan push perubahan itu.
2. [netlify.com](https://netlify.com) → **Add new site → Import an existing project** → repo GitHub ini. Pengaturan build dibaca dari `netlify.toml` (base `frontend`, `npm run build`, publish `frontend/dist`, Node 22).
3. Tidak perlu variabel lingkungan di Netlify: aplikasi memanggil `/api/v1/...` di alamat yang sama, lalu Netlify meneruskannya ke Vercel.
4. Buka alamat Netlify, daftar akun guru dengan `ZMATH_TEACHER_CODE`, buat kelas, lalu coba sebagai siswa.

`netlify.toml` juga berisi *SPA fallback* (`/*` → `/index.html`, agar halaman seperti `/latihan/m1-t1` tidak 404 saat di-refresh) dan header `no-cache` untuk `sw.js`/`index.html` agar pembaruan PWA cepat sampai.

## 4. Menjalankan di komputer sendiri

- Tanpa `DATABASE_URL`: SQLite di `backend/.data/` (seperti biasa, `jalankan.bat`).
- Dengan `DATABASE_URL` di `backend/.env`: aplikasi lokal memakai database Supabase yang **sama** dengan aplikasi online. Hati-hati, data uji ikut tersimpan di sana. Akun demo **tidak** dibuat otomatis dalam keadaan ini (kecuali `ZMATH_SEED_DEMO=1`). Hapus atau beri `#` pada baris `DATABASE_URL` untuk kembali ke SQLite lokal.
- Jika Windows memblokir DLL psycopg ("An Application Control policy has blocked this file", Smart App Control), backend otomatis memakai driver `pg8000` (Python murni, dipasang oleh `requirements-dev.txt` lewat `jalankan.bat`). Bisa juga dipaksa dengan `ZMATH_PG_DRIVER=pg8000`.

## 5. Menguji dengan PostgreSQL

`pytest` biasa **selalu** memakai SQLite sementara, walaupun `backend/.env` berisi `DATABASE_URL`, agar data uji tidak masuk ke database sungguhan (`tests/conftest.py`).

Untuk menguji terhadap PostgreSQL, berikan database uji **terpisah** dengan sengaja:

```bash
cd backend
ZMATH_TEST_DATABASE_URL="postgresql://…/postgres" ZMATH_PG_DRIVER=pg8000 .venv/Scripts/python.exe -m pytest -q
```

Test membuat akun uji dan akun demo. Pakai proyek/database Supabase khusus uji, atau kosongkan tabel sesudahnya.

## 6. Daftar periksa sebelum dipakai siswa

- [ ] `ZMATH_SEED_DEMO` = `0` (atau tidak diisi) di Vercel
- [ ] `ZMATH_JWT_SECRET` dan `ZMATH_TEACHER_CODE` diisi
- [ ] Alamat Vercel di `netlify.toml` sudah diganti
- [ ] Pertimbangkan Gemini Paid Tier atau `ZMATH_AI_HINTS=0` (lihat [KEAMANAN-PRIVASI.md](KEAMANAN-PRIVASI.md))
- [ ] Coba di HP: masuk, latihan, petunjuk, Tanya Asisten, dasbor guru
