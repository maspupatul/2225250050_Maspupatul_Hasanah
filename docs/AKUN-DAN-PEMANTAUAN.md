# Akun Siswa & Guru dan Dasbor Pemantauan

Status: **diimplementasikan (Tahap 1, SQLite lokal)**. Rancangan jangka panjang tetap Supabase (lihat §6).

## 1. Peran

| Peran | Masuk dengan | Setelah masuk | Tidak bisa |
|---|---|---|---|
| `siswa` | Nama pengguna + kata sandi (min. 6 karakter), **Kode Kelas** dari guru (opsional, bisa diisi/diganti nanti di Profil) | Beranda belajar (Belajar · Latihan · Ujian Akhir · Profil) | Membuka `/guru/*` |
| `guru` | Email/nama pengguna + kata sandi (min. 8 karakter) | `/guru/dashboard` | Membuka halaman belajar siswa, mengubah progres siswa |

- Pendaftaran siswa **wajib** mencentang izin orang tua/wali (UU PDP, [KEAMANAN-PRIVASI.md](KEAMANAN-PRIVASI.md) §3).
- Pendaftaran guru **tertutup**. Pendaftaran hanya bisa dilakukan dengan kode dari admin sekolah (`ZMATH_TEACHER_CODE`). Jika variabel ini kosong, pendaftaran guru dimatikan.
- Guru **tidak** mengisi kelas saat mendaftar. Guru membuat kelas di dasbor ("Kelola Kelas"). Server lalu membuat **kode kelas** 6 karakter yang acak dan unik (mis. `ZM7A92`). Kode tidak memakai huruf/angka yang mirip: 0/O, 1/I/L.
- Siswa bergabung dengan memasukkan kode itu (saat daftar atau di Profil). Kode yang tidak terdaftar ditolak. Salah memasukkan kode di Profil 5 kali dalam 5 menit akan diblokir sementara (429), agar kode tidak bisa ditebak.
- Guru hanya melihat siswa yang kode kelasnya milik **salah satu kelas guru itu**. Siswa tanpa kelas tidak terlihat oleh guru mana pun.

### Kelas (tabel `classes`)

| Kolom | Isi |
|---|---|
| `id` | kunci utama |
| `class_name` | nama tampilan, huruf kapital (mis. `VII-A`); unik per guru |
| `class_code` | 6 karakter unik, dibuat server |
| `teacher_id` | guru pemilik (`users.id`) |
| `created_at` | waktu dibuat |

`users.class_code` (boleh kosong) menyimpan kelas siswa. Kolom lama `users.kelas` (teks bebas) **tidak dipakai lagi untuk akses**. Saat server menyala, `migrate_legacy_classes()` mengubah setiap `kelas` guru lama menjadi kelas baru dengan kode acak. Siswa yang `kelas`-nya sama ikut dipindah. Proses ini aman dijalankan berulang. Jika dua guru lama memakai teks kelas yang sama, siswanya masuk ke kelas guru yang terdaftar lebih dulu.

## 2. Akun Demo (hanya untuk uji coba)

Dibuat otomatis saat database masih kosong dan `ZMATH_SEED_DEMO=1` (bawaan di pengembangan):

| Peran | Nama pengguna | Kata sandi | Kelas | Kondisi |
|---|---|---|---|---|
| guru | `guru` | `guru123` | VII-A (kode `ZM7A92`) | — |
| siswa | `ayu` | `123456` | VII-A | Semua pelajaran selesai, nilai ujian 88 → **Tuntas** |
| siswa | `bima` | `123456` | VII-A | 7 pelajaran → **Berproses** |
| siswa | `citra` | `123456` | VII-A | 3 pelajaran, banyak petunjuk → **Perlu bimbingan** |

Kode `ZM7A92` hanya berlaku untuk database demo **baru**. Database demo lama dimigrasikan dengan kode acak (lihat Kelola Kelas di dasbor).

**Sebelum dipakai di sekolah:** set `ZMATH_SEED_DEMO=0`, hapus `backend/.data/zmath.db`, dan isi `ZMATH_JWT_SECRET` serta `ZMATH_TEACHER_CODE`.

## 3. Pencatatan Progres

Progres tetap disimpan di perangkat (aplikasi tetap jalan saat offline), lalu **dikirim otomatis** ke server sekitar 1,5 detik setelah ada perubahan. Perubahan yang dikirim: pelajaran, soal benar/mandiri, petunjuk, soal ditunda, nilai Ujian Akhir per tahap, dan hari aktif. Jika gagal (offline), data dikirim lagi saat perubahan berikutnya atau saat perangkat kembali online (`frontend/src/lib/progressSync.ts`).

**Aturan penggabungan** (siswa bisa belajar di beberapa perangkat; `services/progress_report.py`): pelajaran yang selesai di mana pun tetap selesai; penguasaan dan penghitung memakai nilai terbesar; riwayat ujian dan hari aktif digabung; Antrean Ulang mengikuti perangkat terakhir. Saat login, progres akun **menggantikan** progres di perangkat; saat keluar, perangkat dibersihkan (aman untuk HP bersama).

## 4. Dasbor Guru

| Bagian | Isi |
|---|---|
| Kelola Kelas | Tombol "Buat Kelas Baru"; kartu tiap kelas berisi nama, kode kelas + tombol **Salin Kode**, jumlah siswa yang bergabung, dan sakelar **Tanya Asisten untuk siswa** (Aktif/Mati, bawaan Aktif). Jika dimatikan, tombol Tanya Asisten tidak muncul untuk siswa kelas itu dan server menolak permintaannya (403) |
| Filter kelas | Pil "Semua Kelas" · per kelas (muncul jika guru punya > 1 kelas). Ringkasan, daftar siswa, dan Export CSV mengikuti kelas yang dipilih |
| Ringkasan kelas | Siswa terdaftar, rata-rata nilai ujian terbaik, ketuntasan materi (rata-rata % pelajaran selesai), jumlah siswa perlu bimbingan |
| Daftar siswa | Kartu (HP) atau tabel (laptop): progres 4 subbab, nilai ujian terbaik, jumlah petunjuk, status. Siswa "perlu bimbingan" tampil paling atas |
| Cari & filter | Nama/username; status Semua · Perlu bimbingan · Berproses · Tuntas |
| Export CSV | Pemisah `;` + UTF-8 BOM (langsung rapi di Excel Indonesia); isi yang diawali `= + - @` dinetralkan agar tidak dieksekusi sebagai rumus |
| Detail siswa | Progres per subbab, statistik, pelajaran **yang perlu diperkuat** (belum selesai atau penguasaan < 60%, plus pelajaran yang soalnya ada di Antrean Ulang), riwayat ujian |
| Atur ulang kata sandi | Di Detail siswa: "Atur Ulang Kata Sandi" → konfirmasi → server membuat **kata sandi sementara** 6 karakter (huruf kecil + angka, tanpa huruf/angka yang mirip seperti i, l, o, 0, 1). Ditampilkan **sekali** + tombol Salin, lalu guru memberitahukannya ke siswa. Kata sandi lama langsung tidak berlaku, dan blokir login (5× salah) dibuka. Sesi login siswa yang sudah aktif di perangkat lain tetap berlaku sampai token habis (7 hari). Siswa lalu bisa mengganti kata sandi sementara itu sendiri di **Profil → Kata sandi → Ubah** (kata sandi lama, kata sandi baru, ulangi kata sandi baru) |

**Status** (`student_status`):
- **Tuntas**: semua pelajaran selesai dan nilai ujian terbaik ≥ KKM 70.
- **Perlu bimbingan**: rata-rata penguasaan < 60%, ≥ 3 soal ditunda, atau petunjuk lebih banyak daripada soal benar (minimal 5 aktivitas).
- **Berproses**: selain itu.

## 5. API

| Method | Path | Peran |
|---|---|---|
| POST | `/api/v1/auth/register` | publik (siswa; guru dengan kode) |
| POST | `/api/v1/auth/login` | publik; 5 kali gagal dalam 5 menit → 429 |
| GET | `/api/v1/auth/me` | semua |
| PUT | `/api/v1/auth/me/class` | siswa; `{"class_code": "ZM7A92"}` bergabung/ganti kelas, `null` keluar kelas |
| GET | `/api/v1/progress` | siswa |
| POST | `/api/v1/progress/sync` | siswa |
| GET | `/api/v1/guru/classes` | guru: daftar kelasnya + `student_count` |
| POST | `/api/v1/guru/classes` | guru: `{"class_name": "VII-A"}` → kelas baru + `class_code` (201; 409 jika nama sudah dipakai) |
| PUT | `/api/v1/guru/classes/{class_code}/assistant` | guru (kelasnya sendiri; 404 jika bukan): `{"enabled": false}` mematikan Tanya Asisten |
| GET | `/api/v1/practice/assistant` | siswa: apakah Tanya Asisten aktif untuknya |
| POST | `/api/v1/practice/attempts/{id}/assistant` | siswa yang sedang masuk. Lihat [API-SPEC.md](API-SPEC.md) §3.12d |
| GET | `/api/v1/guru/students-summary?class_code=…` | guru: semua kelasnya, atau satu kelas (404 jika kode bukan miliknya) |
| GET | `/api/v1/guru/students/{id}` | guru (kelasnya sendiri) |
| PUT | `/api/v1/auth/me/password` | siswa/guru yang sedang masuk: ubah kata sandi sendiri (wajib kata sandi lama; salah 5× → tunggu 5 menit) |
| POST | `/api/v1/guru/students/{id}/reset-password` | guru (kelasnya sendiri). Lihat "Atur ulang kata sandi" di §4 |

Token: JWT HS256 di header `Authorization: Bearer …`, berlaku 7 hari (`ZMATH_TOKEN_DAYS`). Kata sandi disimpan sebagai PBKDF2-SHA256 + salt.

## 6. Penyimpangan dari Dokumen Lain (perlu keputusan)

| Dokumen | Tertulis | Tahap 1 ini | Alasan |
|---|---|---|---|
| CLAUDE.md §2, KEAMANAN-PRIVASI §4 | Supabase Auth + RLS | SQLite lokal + JWT sendiri | Permintaan pengguna; belum ada proyek Supabase. Tabel dirancang agar mudah dipindah |
| KEAMANAN-PRIVASI §4 | Kata sandi ≥ 8 karakter, verifikasi email | Siswa: kata sandi ≥ 6, tanpa email | Mudah diingat siswa SMP; diimbangi pembatasan percobaan login |
