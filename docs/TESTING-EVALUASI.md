# Strategi Pengujian dan Evaluasi — Z-Math

Dokumen ini mencakup dua hal:
1. **Pengujian perangkat lunak**: apakah aplikasi bekerja dengan benar?
2. **Evaluasi pembelajaran**: apakah aplikasi membantu siswa belajar dan menurunkan beban kognitif ekstrinsik?

---

## Bagian A — Pengujian Perangkat Lunak

### A1. Piramida Pengujian

| Level | Alat | Cakupan | Target |
|---|---|---|---|
| Unit (backend) | pytest | Generator soal, penilai, detektor miskonsepsi, perhitungan mastery & skor survei | Cakupan ≥ 90% untuk `services/` |
| Unit (frontend) | Vitest + React Testing Library | Logika `NumberLine`, `StoryGuide`, util, hooks | Cakupan ≥ 70% |
| Integrasi API | pytest + httpx `TestClient` | Endpoint + auth + peran | Semua endpoint di API-SPEC |
| RLS | SQL test (`pgTAP`) atau skrip pytest dengan token per peran | Kebijakan per tabel | Semua tabel |
| E2E | Playwright (Chromium + emulasi Android 360×640) | Alur utama pengguna | 6 skenario kritis |
| Perangkat | Android fisik low-end (RAM 2–3 GB) + emulator | Performa, sentuh, offline | Lulus checklist |

### A2. Kasus Uji Kritis (Unit)

**Generator soal (`problem_generator.py`)**
- Seed yang sama menghasilkan soal yang identik (deterministik).
- Semua parameter dan hasil berada dalam rentang level.
- Tidak ada pembagian dengan nol, dan hasil pembagian selalu bilangan bulat.
- Uji berbasis properti (Hypothesis): untuk 1.000 seed acak, `answer == eval_safe(model)`.

**Kebijakan tanpa jawaban (`hint_generator`, `twin`, respons API). Test ini WAJIB lulus di CI.**
- Untuk setiap skema × 200 seed × 5 langkah × 3 tingkat petunjuk: nilai hasil akhir (dan nilai mutlaknya dengan satuan) **tidak muncul** sebagai token bilangan di `text`/`template`, dan `visual.showEnd == false`.
- Petunjuk 3 pada langkah `model` selalu menyisakan ≥ 1 kotak kosong (`□`).
- Hasil Soal Kembar ≠ hasil soal asli, dan konteksnya berbeda.
- Respons `/steps` dengan `correct: false` atau `attempt_status: "deferred"` tidak memuat field `review`, `answer`, atau `explanation`.
- Tidak ada route yang mengembalikan jawaban untuk attempt berstatus selain `correct` (uji dengan enumerasi semua route OpenAPI).

**Mesin pemodelan** ([PEMODELAN-SOAL-CERITA.md](PEMODELAN-SOAL-CERITA.md) §7)
| Model kunci | Model siswa | Hasil yang diharapkan |
|---|---|---|
| (−2) + (−3) + 1 | 1 + (−2) + (−3) | setara |
| −4 − (−10) | −4 + 10 | setara |
| 4 × (−3) | (−3)+(−3)+(−3)+(−3) | setara |
| (−2) + (−3) + 1 | −4 | ditolak: `missing_quantity` (langsung hasil) |
| (−2) + (−3) | (−2) + 3 | ditolak: `keyword_sign` pada kuantitas ke-2 |
| □ + (−4) = −1 (ditanya awal) | (−1) + (−4) | ditolak: `unknown_position` |

**Penilai & miskonsepsi**
| Soal | Jawaban | Hasil yang diharapkan |
|---|---|---|
| (−5) + 3 | −2 | benar |
| (−5) + 3 | 2 | `sign_error` |
| (−5) + 3 | 8 atau −8 | `abs_sum` |
| 4 − (−2) | 2 | `sub_negative` |
| (−3) × (−4) | −12 | `mult_sign` |
| bandingkan −7 dan −2 | −7 > −2 | `compare_order` |
| jawaban berupa teks "−7" (U+2212) | dinormalisasi | benar |

### A3. Skenario E2E

1. Registrasi → gabung kelas → cek prasyarat → muncul rekomendasi remedial.
2. Membuka M1.2 → berinteraksi dengan garis bilangan → keluar → masuk lagi → posisi segmen tetap tersimpan.
3. Soal cerita terpandu: salah di langkah 1 → petunjuk → benar → selesai → mastery bertambah.
4. Menulis catatan → muat ulang → catatan masih ada. Guru tidak dapat melihatnya.
5. Guru membuat kelas → siswa bergabung → data siswa muncul di dasbor guru.
6. Offline: mengerjakan 3 soal → kembali online → data tersinkronisasi.
7. Jalur kesulitan: salah → Petunjuk 1 → tombol Petunjuk 2 terkunci sampai mencoba lagi → Petunjuk 2 & 3 → salah 2x → Soal Kembar → salah → status ditunda. Di sepanjang alur, jawaban asli **tidak pernah** tampil di DOM (cek `textContent`).
8. Misi Literasi: stimulus tetap terlihat saat menjawab 5 soal → skor per indikator muncul di profil → agregat muncul di dasbor guru.
9. Visual: soal suhu menampilkan termometer → "Lihat sebagai garis bilangan" → kembali ke termometer, dengan posisi tetap sinkron.

### A4. Checklist Non-Fungsional
- [ ] Lighthouse: Performance ≥ 85, Accessibility ≥ 95, PWA lulus.
- [ ] Bundle awal < 300 KB gzip.
- [ ] Animasi garis bilangan ≥ 50 fps di perangkat low-end.
- [ ] Tidak ada secret di bundle frontend (`grep` untuk service role key).
- [ ] Uji axe-core tanpa pelanggaran serius.
- [ ] Tata letak aman pada lebar 360 px dan ukuran font sistem 130%.

### A5. CI (GitHub Actions)
Setiap PR menjalankan: `npm run lint && npm run test && npm run build` (frontend), lalu `ruff check . && black --check . && pytest` (backend). E2E dijalankan pada branch `main` setiap malam.

---

## Bagian B — Evaluasi Pembelajaran

### B1. Pertanyaan Evaluasi
1. Apakah pemakaian Z-Math meningkatkan kemampuan menyelesaikan soal bilangan bulat, terutama soal cerita? (G2)
2. Apakah siswa merasakan beban kognitif ekstrinsik yang lebih rendah? (G1)
3. Apakah siswa mampu menjelaskan operasi dengan garis bilangan (pemahaman konsep)? (G3)
4. Seberapa mudah aplikasi digunakan? (kegunaan)
5. Apakah literasi matematika siswa (merumuskan, menggunakan, menafsirkan) berkembang? (G5)
6. Apakah petunjuk 3 tingkat tanpa jawaban membuat siswa menyelesaikan soal sendiri, dan apakah ketergantungan pada petunjuk menurun? (G6)

### B2. Desain
- **Minimal**: *one-group pretest–posttest design* (1 kelas, ±30 siswa).
- **Disarankan**: *quasi-experimental nonequivalent control group*. Kelas eksperimen memakai Z-Math, kelas kontrol belajar seperti biasa, dengan materi dan durasi yang sama (2 × 80 menit).

### B3. Instrumen

| Instrumen | Isi | Kapan |
|---|---|---|
| Pre-test / Post-test | 15 soal: 5 konsep (garis bilangan, perbandingan), 5 operasi, 5 soal cerita. Divalidasi ahli + uji reliabilitas (Cronbach's α ≥ 0,7) | Sebelum & sesudah |
| Tes literasi matematika (pre/post) | 12 soal gaya AKM berbasis 3 stimulus (konteks personal, sosial budaya, saintifik), mencakup level pemahaman, penerapan, dan penalaran, dengan bentuk PG, PG kompleks, menjodohkan, isian, dan uraian. Uraian dinilai dengan rubrik 0–2 (indikator LM1–LM10). Divalidasi ahli | Sebelum & sesudah |
| Kuesioner beban kognitif | 10 butir skala 0–10 (adaptasi Leppink dkk., 2013): IL (butir 1–3), EL (butir 4–6), GL (butir 7–10) | Setelah modul M3 & M6 (dalam aplikasi, F-14) |
| Skala usaha mental Paas | 1 butir skala 1–9 ("Seberapa besar usaha yang kamu keluarkan?") | Setelah setiap sesi latihan (opsional) |
| System Usability Scale (SUS) | 10 butir, versi Bahasa Indonesia | Akhir uji coba |
| Wawancara pasca-uji | Protokol yang sama dengan wawancara awal (kode IL/EL/GL/K) | 3–5 siswa |
| Log aplikasi | Waktu belajar, jumlah petunjuk, miskonsepsi | Otomatis |

**Contoh butir kuesioner beban kognitif (adaptasi Bahasa Indonesia)**
| No | Jenis | Pernyataan (0 = sangat tidak setuju, 10 = sangat setuju) |
|---|---|---|
| 1 | IL | Materi pada modul ini sangat rumit. |
| 4 | EL | Penjelasan di aplikasi ini membingungkan. |
| 5 | EL | Bahasa soal di aplikasi ini sulit dipahami. |
| 7 | GL | Aplikasi ini benar-benar membantu saya memahami bilangan bulat. |

### B4. Analisis Data

| Data | Analisis |
|---|---|
| Pre/post-test | N-gain Hake: g = (post − pre)/(100 − pre). Kategori: < 0,3 rendah, 0,3–0,7 sedang, > 0,7 tinggi. Uji t berpasangan atau Wilcoxon |
| Eksperimen vs kontrol | Uji t independen atau Mann–Whitney untuk N-gain dan skor EL |
| Beban kognitif | Statistik deskriptif per subskala, perbandingan M3 vs M6 |
| SUS | Skor 0–100. ≥ 68 = di atas rata-rata |
| Wawancara | Koding tematik dengan kode IL/EL/GL/K, dibandingkan dengan temuan awal |
| Log | Tren pemakaian petunjuk dan miskonsepsi per topik |
| Tes literasi | N-gain total dan per proses (merumuskan/menggunakan/menafsirkan), serta perubahan distribusi level kompetensi (Perlu Intervensi/Dasar/Cakap/Mahir) |
| Kemandirian | % percobaan `correct` vs `deferred`, rata-rata `max_hint_level` per minggu (harapannya menurun), dan tingkat keberhasilan setelah Soal Kembar |

### B5. Kriteria Keberhasilan
- Rata-rata N-gain ≥ 0,3 (sedang).
- Skor EL kelompok eksperimen lebih rendah dari kontrol (atau ≤ 4 dari 10 jika tanpa kontrol).
- SUS ≥ 68.
- N-gain literasi ≥ 0,3 dan proporsi siswa level "Cakap" atau lebih naik ≥ 20 poin persen.
- ≥ 80% percobaan selesai berstatus `correct`, dan rata-rata tingkat petunjuk menurun dari minggu ke-1 ke minggu ke-2.
- Temuan EL1–EL3 dari wawancara awal tidak muncul lagi atau berkurang pada wawancara pasca-uji.

### B6. Etika
- Izin sekolah dan persetujuan orang tua/wali (*informed consent*) serta persetujuan siswa (*assent*).
- Siswa boleh berhenti kapan saja tanpa konsekuensi pada nilai.
- Data dianonimkan sebelum dianalisis. Lihat [KEAMANAN-PRIVASI.md](KEAMANAN-PRIVASI.md).
