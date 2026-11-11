# Keamanan dan Privasi — Z-Math

Pengguna utama Z-Math adalah **anak di bawah umur (12–14 tahun)**. Karena itu, keamanan dan privasi menjadi persyaratan utama, bukan tambahan.

## 1. Dasar Hukum dan Etika

- **UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP)**. Pemrosesan data pribadi anak memerlukan **persetujuan orang tua/wali**.
- Etika penelitian pendidikan: izin sekolah, *informed consent* orang tua, dan *assent* siswa.
- Prinsip **privacy by design** dan **data minimization**.

## 2. Data yang Dikumpulkan

| Data | Wajib? | Tujuan | Catatan |
|---|---|---|---|
| Email | Ya | Login | Dapat berupa email sekolah atau orang tua |
| Nama tampilan | Ya | Sapaan & dasbor guru | Boleh nama panggilan |
| Kelas (7/8/9) | Opsional | Penyesuaian konten | — |
| Jawaban & langkah soal | Ya | Umpan balik, mastery, penelitian | Dianonimkan untuk analisis |
| Catatan pribadi | Opsional | Belajar (GL1) | **Hanya pemilik** yang dapat membaca |
| Respons kuesioner | Opsional | Penelitian | Dianonimkan saat diekspor |

**Tidak dikumpulkan:** tanggal lahir lengkap, alamat, nomor HP, foto, lokasi, kontak, ID iklan.
**Tidak digunakan:** SDK iklan, pelacak pihak ketiga, analitik yang menjual data.

## 3. Persetujuan

1. Saat mendaftar, siswa mencentang: "Orang tua/wali saya sudah mengizinkan saya memakai aplikasi ini."
2. Untuk uji coba di sekolah, formulir persetujuan orang tua dikumpulkan secara tertulis oleh sekolah atau peneliti **sebelum** akun dibuat.
3. Kebijakan privasi ditulis dalam bahasa yang ramah anak dan dapat diakses dari layar login dan profil.

## 4. Kontrol Akses

| Prinsip | Implementasi |
|---|---|
| Autentikasi | Supabase Auth, kata sandi ≥ 8 karakter, verifikasi email |
| Otorisasi | RLS di semua tabel + pemeriksaan peran di FastAPI (`require_role`) |
| Least privilege | Frontend hanya memakai anon key. Service role key hanya di backend |
| Pemisahan data | Guru hanya melihat siswa di kelasnya. Guru **tidak** dapat melihat catatan pribadi |
| Peran | `teacher` dan `admin` hanya diberikan secara manual oleh admin |

## 5. Keamanan Teknis

| Ancaman | Mitigasi |
|---|---|
| Kebocoran secret | `.env` di `.gitignore`. Secret disimpan di dashboard hosting. Pemindaian secret di CI (gitleaks) |
| Jawaban soal terekspos | Kunci jawaban tidak dikirim ke klien. Tabel `problem_templates` tanpa akses klien |
| Injeksi kode di evaluasi ekspresi | Parser AST dengan whitelist operator, **tanpa `eval()`** |
| SQL injection | Query melalui client Supabase (terparameterisasi) |
| XSS | React escape default. Tidak memakai `dangerouslySetInnerHTML` untuk konten pengguna. CSP header |
| Tebak kode kelas | Kode 6 karakter acak (tanpa karakter ambigu), rate limit 10/menit |
| Brute force login | Rate limit bawaan Supabase Auth |
| CORS | Whitelist origin: domain web, `capacitor://localhost`, `https://localhost` |
| Transport | HTTPS wajib. HSTS di produksi |
| Dependensi rentan | Dependabot + `npm audit` + `pip-audit` di CI |

## 6. Retensi dan Penghapusan

- Siswa atau orang tua dapat meminta penghapusan akun dari menu Profil. Semua data terkait ikut terhapus (`on delete cascade`).
- Data penelitian dianonimkan (`student_id` diganti hash SHA-256 + salt) paling lambat 30 hari setelah uji coba berakhir.
- Akun uji coba yang tidak aktif selama 12 bulan dihapus.
- Backup Supabase mengikuti kebijakan bawaan (point-in-time pada paket berbayar, harian pada paket gratis).

## 7. Respons Insiden

1. Identifikasi dan isolasi (cabut key, nonaktifkan endpoint).
2. Nilai dampak: data apa dan siapa yang terdampak.
3. Beri tahu sekolah dan orang tua dalam 3 × 24 jam (sesuai UU PDP).
4. Perbaiki, lalu tulis laporan pasca-insiden.

## 8. Checklist Sebelum Rilis
- [ ] RLS aktif di semua tabel (`select tablename from pg_tables where schemaname='public' and rowsecurity = false` mengembalikan 0 baris).
- [ ] Tidak ada service role key di bundle frontend atau APK.
- [ ] Kebijakan privasi tersedia di aplikasi.
- [ ] Formulir persetujuan orang tua sudah dikumpulkan untuk peserta uji coba.
- [ ] Ekspor data penelitian hanya berisi data anonim.
- [ ] Nama dan foto narasumber wawancara tidak ada di repositori.
