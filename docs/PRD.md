# Product Requirements Document (PRD) — Z-Math

| Atribut | Isi |
|---|---|
| Produk | Z-Math: aplikasi belajar Bilangan Bulat untuk SMP |
| Versi dokumen | 1.1 (draf): menambah literasi matematika, mesin pemodelan, visual kontekstual, petunjuk 3 tingkat tanpa jawaban |
| Tanggal | 10 November 2026 |
| Penyusun | Maspupatul Hasanah (2225250050) |
| Status | Draf, siap ditinjau |
| Platform | Web (PWA) dan Android |

---

## 1. Latar Belakang

Bilangan bulat adalah materi dasar Kelas VII SMP/MTs dan menjadi prasyarat aljabar, persamaan linear, dan koordinat. Wawancara dengan siswa kelas VIII (06 November 2026, durasi 40 menit, artefak pemicu: Buku Siswa Matematika Kelas VII Kurikulum 2013) menunjukkan bahwa kesulitan siswa **lebih banyak berasal dari cara materi disajikan** daripada dari materinya sendiri:

- Pembelajaran di kelas didominasi penjelasan di papan tulis dengan objek abstrak (K02).
- Tidak ada peragaan konkret seperti garis bilangan (EL2).
- Penjelasan terlalu cepat (EL3).
- Bahasa soal cerita sulit dipahami (EL1, IL1).
- Siswa cenderung menghafal rumus dan pola soal tanpa memahami makna (IL2, GL2).

Detail analisis ada di [RISET-WAWANCARA.md](RISET-WAWANCARA.md).

## 2. Pernyataan Masalah

> Siswa SMP kesulitan memahami bilangan bulat, terutama soal cerita, karena materi disajikan secara abstrak, cepat, dan memakai bahasa yang membebani. Akibatnya beban kognitif ekstrinsik tinggi, dan siswa bergantung pada hafalan pola soal tanpa memahami konsepnya.

## 3. Visi Produk

Aplikasi yang membuat bilangan bulat **terlihat, dapat disentuh, dan dipelajari sesuai kecepatan masing-masing siswa**, sekaligus **menumbuhkan literasi matematika**: kemampuan membaca situasi nyata, memodelkannya secara matematis, menyelesaikannya, dan menafsirkan hasilnya. Setiap konsep diperagakan dengan visual kontekstual (garis bilangan, termometer, lift, skala laut, keping +/−), setiap soal cerita dimodelkan langkah demi langkah, dan **jawaban tidak pernah diberikan langsung**. Siswa dibimbing dengan petunjuk 3 tingkat sampai menemukan jawabannya sendiri.

## 4. Tujuan dan Non-Tujuan

### 4.1 Tujuan (MVP)
| Kode | Tujuan | Indikator |
|---|---|---|
| G1 | Menurunkan beban kognitif ekstrinsik saat belajar bilangan bulat | Skor EL pada kuesioner beban kognitif turun dibanding pembelajaran biasa |
| G2 | Meningkatkan kemampuan menyelesaikan soal cerita bilangan bulat | Rata-rata *gain* pre-test ke post-test ≥ 0,3 (N-gain sedang) |
| G3 | Membangun pemahaman konsep, bukan hafalan rumus | ≥ 70% siswa mampu menjelaskan operasi dengan garis bilangan |
| G4 | Memberi guru gambaran kesulitan siswa | Guru dapat melihat topik dengan tingkat kesalahan tertinggi per kelas |
| G5 | Menumbuhkembangkan literasi matematika (merumuskan, menggunakan, menafsirkan) | N-gain tes literasi gaya AKM ≥ 0,3; proporsi siswa level "Cakap" atau lebih naik ≥ 20 poin persen |
| G6 | Membangun pemahaman konsep lewat penemuan sendiri, bukan dengan diberi jawaban | ≥ 80% soal diselesaikan benar oleh siswa sendiri (dengan atau tanpa petunjuk), tanpa jawaban diungkap |

Kerangka literasi dijelaskan di [LITERASI-MATEMATIKA.md](LITERASI-MATEMATIKA.md).

### 4.2 Non-Tujuan (di luar MVP)
- Materi selain Bilangan Bulat (pecahan, aljabar, dll.).
- Fitur chat atau forum terbuka antar siswa.
- Ujian resmi atau penilaian rapor. (Ujian Akhir F-23 adalah evaluasi mandiri di aplikasi, bukan nilai rapor.)
- Platform iOS (dapat ditambahkan kemudian melalui Capacitor).
- Konten berbayar dan iklan.

## 5. Persona

### P1 — Siswa: "Raihan", 13 tahun, Kelas VII/VIII
- Pernah belajar bilangan bulat di SD, tetapi merasa materi SMP "lebih banyak dan lebih susah".
- Bingung dengan bahasa soal cerita dan tidak tahu harus mulai dari mana.
- Kebiasaan positif: mencatat sendiri, bertanya kepada teman, belajar dari contoh soal yang mirip.
- Memakai HP Android kelas menengah ke bawah dengan kuota terbatas.
- **Kebutuhan:** penjelasan pelan dan bisa diulang, visual garis bilangan, panduan soal cerita, contoh sebelum latihan.

### P2 — Guru Matematika: "Bu Sari"
- Mengajar beberapa kelas VII dengan waktu terbatas.
- **Kebutuhan:** mengetahui siswa mana dan topik apa yang paling sulit, lalu memberikan tugas latihan.

### P3 — Admin Konten (peneliti/pengembang)
- **Kebutuhan:** menambah dan mengubah soal serta pelajaran tanpa perlu mengubah kode.

## 6. Daftar Fitur (MVP)

Prioritas memakai metode MoSCoW: **M** = Must, **S** = Should, **C** = Could, **W** = Won't (tidak di MVP).

| ID | Fitur | Prioritas | Temuan terkait |
|---|---|---|---|
| F-01 | Registrasi & login (email/kata sandi, Google) dengan peran siswa/guru/admin | M | — |
| F-02 | Gabung kelas dengan kode kelas 6 karakter | M | K02 |
| F-03 | Cek prasyarat operasi hitung dasar + rekomendasi remedial | M | IL3 |
| F-04 | Pelajaran tersegmentasi dengan tempo dikendalikan siswa | M | EL3, K01 |
| F-05 | Garis bilangan interaktif (penjumlahan, pengurangan, perbandingan) | M | EL2, K02 |
| F-06 | Pemandu soal cerita 4 langkah | M | IL1, EL1 |
| F-07 | Sorotan kata kunci & glosarium kontekstual | M | EL1 |
| F-08 | Alur worked example → faded example → latihan mandiri | M | GL2, GL3, IL2 |
| F-09 | Generator soal berpola (angka berbeda, struktur sama) | M | GL2, GL3 |
| F-10 | Umpan balik per langkah + **petunjuk 3 tingkat tanpa memberikan jawaban** | M | IL1, IL2, EL3 |
| F-11 | Catatan pribadi per pelajaran | S | GL1 |
| F-12 | Peta progres belajar dan rangkuman per modul | S | K01 |
| F-13 | Dasbor guru: progres kelas & topik tersulit | S | K02 |
| F-14 | Kuesioner beban kognitif singkat di akhir modul | S | (evaluasi penelitian) |
| F-15 | Mode offline (PWA cache konten & antrean sinkronisasi) | S | konteks kuota |
| F-16 | Fitur "Tanya Teman": bagikan catatan/soal ke teman sekelas | C | GL1 |
| F-17 | Lencana (badge) apresiasi ringan | C | motivasi |
| F-18 | Materi selain bilangan bulat | W | — |
| F-19 | Visual kontekstual: termometer, skala laut, gedung & lift, keping +/−, dompet, papan skor, profil ketinggian, grafik data | M | EL2, K02 |
| F-20 | Mesin pemodelan soal cerita (8 jenis soal → model → penyelesaian langkah demi langkah) | M | IL1, IL2, EL1 |
| F-21 | Misi Literasi: stimulus (teks/tabel/grafik) + 3–5 soal pemahaman → penerapan → penalaran | M | IL1, EL1 (tujuan G5) |
| F-22 | Pemodel Bebas: siswa mengetik soal cerita sendiri, aplikasi membantu memodelkannya | C | GL1, GL3 |
| F-23 | Ujian Akhir: evaluasi rangkuman semua materi, bertahap Dasar → Menengah → HOTS, bank soal terpisah dari latihan | S | G2, G5 |

## 7. User Stories dan Acceptance Criteria

### F-01 Autentikasi
**US-01** Sebagai siswa, saya ingin mendaftar dan masuk dengan mudah agar progres saya tersimpan.
- AC1: Siswa dapat mendaftar dengan nama tampilan, email, dan kata sandi minimal 8 karakter, atau melalui Google.
- AC2: Setelah masuk, siswa diarahkan ke beranda. Sesi bertahan setelah aplikasi ditutup.
- AC3: Peran default adalah `student`. Peran `teacher` hanya bisa diberikan oleh admin.

### F-02 Gabung Kelas
**US-02** Sebagai siswa, saya ingin memasukkan kode kelas dari guru agar guru dapat melihat progres saya.
- AC1: Kode yang salah menampilkan pesan "Kode kelas tidak ditemukan. Coba cek lagi ya."
- AC2: Siswa dapat tergabung di lebih dari satu kelas.

### F-03 Cek Prasyarat
**US-03** Sebagai siswa, saya ingin tahu apakah kemampuan hitung dasar saya sudah cukup sebelum mulai.
- AC1: Tes berisi 8 soal (2 per operasi: +, −, ×, ÷) dengan bilangan cacah.
- AC2: Jika sebuah operasi dijawab benar kurang dari 2 soal, tampil rekomendasi pelajaran remedial singkat untuk operasi tersebut.
- AC3: Tes dapat dilewati, tetapi rekomendasi tetap muncul di beranda.

### F-04 Pelajaran Tersegmentasi
**US-04** Sebagai siswa, saya ingin belajar sedikit demi sedikit dengan kecepatan saya sendiri.
- AC1: Setiap segmen menampilkan satu konsep dengan teks ≤ 60 kata.
- AC2: Tidak ada perpindahan otomatis. Tombol "Lanjut", "Kembali", dan "Ulangi" selalu tersedia.
- AC3: Indikator posisi (mis. "3 dari 7") selalu terlihat.
- AC4: Posisi terakhir tersimpan, sehingga siswa dapat melanjutkan di lain waktu.

### F-05 Garis Bilangan Interaktif
**US-05** Sebagai siswa, saya ingin melihat dan menggerakkan bilangan di garis bilangan agar paham arti positif, negatif, tambah, dan kurang.
- AC1: Rentang garis bilangan dapat diatur (default −10 sampai 10) dan dapat digeser.
- AC2: Penjumlahan diperagakan sebagai lompatan ke kanan (positif) atau ke kiri (negatif). Pengurangan diperagakan sebagai "lawan arah".
- AC3: Setiap lompatan diberi label angka dan warna (biru = positif, merah = negatif).
- AC4: Animasi berjalan per langkah sesuai ketukan siswa, bukan otomatis.
- AC5: Dapat dioperasikan dengan sentuhan (Android) dan mouse/keyboard (web).

### F-06 Pemandu Soal Cerita
**US-06** Sebagai siswa, saya ingin dipandu langkah demi langkah saat mengerjakan soal cerita.
- AC1: Soal cerita dipecah menjadi 4 langkah: (1) Pahami/Diketahui, (2) Ditanya, (3) Buat Model, (4) Hitung (4a) & Tafsirkan (4b).
- AC2: Langkah berikutnya terbuka **hanya setelah langkah sebelumnya dijawab benar oleh siswa**. Petunjuk membantu, tetapi tidak membuka langkah.
- AC3: Pada langkah 4, hasil divisualkan dengan visual kontekstual yang sesuai (termometer, skala laut, dll.) **setelah** siswa menjawab benar.
- AC4: Langkah 4b meminta siswa menafsirkan hasil dalam konteks ("−7 berarti 7 m di bawah permukaan laut") dan menilai kewajarannya.
- AC5: Pada level lanjut, panduan dapat dimatikan sehingga siswa mengerjakan secara mandiri.

### F-07 Sorotan Kata Kunci
**US-07** Sebagai siswa, saya ingin tahu arti kata-kata di soal cerita yang berhubungan dengan tanda positif/negatif.
- AC1: Kata kunci (mis. "di bawah permukaan laut", "turun", "rugi", "utang", "di bawah nol") ditandai.
- AC2: Ketukan pada kata menampilkan penjelasan singkat dan tanda (+/−) yang sesuai.
- AC3: Glosarium dikelola admin tanpa perubahan kode.

### F-08 Alur Contoh → Latihan
**US-08** Sebagai siswa, saya ingin melihat contoh lengkap dulu, lalu mencoba sebagian, lalu mengerjakan sendiri.
- AC1: Setiap topik berisi ≥ 1 worked example (semua langkah terisi + alasan), ≥ 1 faded example (1–2 langkah dikosongkan), dan ≥ 5 soal latihan mandiri.
- AC2: Setiap langkah worked example menyertakan pertanyaan refleksi singkat ("Mengapa tandanya negatif?").

### F-09 Generator Soal Berpola
**US-09** Sebagai siswa, saya ingin berlatih soal yang polanya sama tetapi angkanya berbeda agar benar-benar paham.
- AC1: Backend menghasilkan soal dari templat dengan parameter acak dalam batas yang aman (mis. hasil tetap dalam −100..100).
- AC2: Soal dapat direproduksi dari `seed`.
- AC3: Setelah 3 jawaban benar berturut-turut, siswa ditawari variasi yang **berbeda struktur** (mencegah sekadar hafal pola, IL2).

### F-10 Umpan Balik dan Petunjuk 3 Tingkat (Tanpa Jawaban)
**US-10** Sebagai siswa, saya ingin tahu letak kesalahan saya dan mendapat petunjuk bertahap, sehingga saya bisa menemukan jawabannya sendiri dan benar-benar paham konsepnya.
- AC1: Jawaban salah dianalisis untuk miskonsepsi umum (mis. salah tanda, menjumlahkan nilai mutlak) dan diberi pesan spesifik **tanpa menyebutkan jawaban benar**.
- AC2: Setiap langkah soal memiliki 3 tingkat petunjuk: **Petunjuk 1 — Makna/Konsep** (pertanyaan pemandu), **Petunjuk 2 — Visual** (termometer/garis bilangan dsb. yang hanya menunjukkan keadaan awal dan arah), **Petunjuk 3 — Strategi** (kerangka model dengan kotak kosong atau langkah pertama tanpa hasil).
- AC3: Petunjuk dibuka berurutan. Petunjuk berikutnya baru tersedia setelah siswa mencoba menjawab minimal 1 kali sejak petunjuk sebelumnya.
- AC4: **Tidak ada tombol "Lihat Jawaban".** Petunjuk, umpan balik, dan visual tidak pernah menampilkan jawaban akhir (diverifikasi dengan test otomatis).
- AC5: Jika masih salah 2 kali setelah Petunjuk 3, aplikasi menampilkan **Soal Kembar**: contoh serupa (angka dan konteks berbeda) yang dikerjakan lengkap. Setelah itu siswa kembali ke soal asli.
- AC6: Jika masih belum berhasil setelah Soal Kembar, soal **ditunda** ke "Antrean Ulang" (muncul lagi di sesi berikutnya dengan angka berbeda) dan ditandai untuk guru. Jawaban soal asli tetap tidak ditampilkan.
- AC7: Pembahasan lengkap (jejak langkah + visual mode `review`) **hanya** muncul setelah siswa menjawab benar, sebagai penguatan.
- AC8: Nada pesan positif dan tidak menyalahkan.

### F-19 Visual Kontekstual
**US-19** Sebagai siswa, saya ingin melihat bilangan bulat dalam bentuk benda yang saya kenal (termometer, lift, laut) agar konsepnya lebih nyata.
- AC1: Tersedia 9 komponen visual sesuai [VISUALISASI.md](VISUALISASI.md), dengan warna tanda yang konsisten.
- AC2: Setiap soal cerita memakai visual yang sesuai konteksnya. Setiap visual dapat dialihkan ke garis bilangan ("Lihat sebagai garis bilangan").
- AC3: Animasi berjalan per ketukan siswa dan menghormati `prefers-reduced-motion`.
- AC4: Mode `hint` tidak menampilkan posisi akhir.

### F-20 Mesin Pemodelan Soal Cerita
**US-20** Sebagai siswa, saya ingin berlatih mengubah berbagai jenis soal cerita menjadi kalimat matematika dan menyelesaikannya.
- AC1: Mendukung 8 jenis soal (CHG, CMP, CMB, RPT, PRT, SCR, AVG, MLT) sesuai [PEMODELAN-SOAL-CERITA.md](PEMODELAN-SOAL-CERITA.md).
- AC2: Untuk jenis CHG, posisi yang tidak diketahui (awal/perubahan/akhir) dirotasi.
- AC3: Model buatan siswa dinilai berdasarkan kesetaraan (mis. `a − b` ≡ `a + (−b)`), bukan kecocokan teks persis, dan harus memakai kuantitas dari soal.
- AC4: Solver menghasilkan jejak langkah dengan alasan, yang ditampilkan setelah siswa menjawab benar.

### F-21 Misi Literasi
**US-21** Sebagai siswa, saya ingin berlatih memakai bilangan bulat untuk memahami data dan situasi nyata.
- AC1: Setiap modul M1–M6 memiliki ≥ 1 Misi Literasi (1 stimulus + 3–5 soal berjenjang pemahaman → penerapan → penalaran).
- AC2: Bentuk soal: pilihan ganda, pilihan ganda kompleks, menjodohkan, isian, uraian dengan pilihan alasan.
- AC3: Tersedia tipe tugas penalaran: Masuk Akal?, Temukan Kesalahan, Siapa yang Benar?, Buat Ceritamu.
- AC4: Stimulus tetap terlihat (dapat dilipat) selama siswa menjawab.
- AC5: Setiap soal ditandai indikator literasi (LM1–LM10). Siswa dan guru dapat melihat level kompetensi literasi per modul.

### F-22 Pemodel Bebas (Could)
**US-22** Sebagai siswa, saya ingin memasukkan soal cerita dari buku atau PR dan dibantu memodelkannya, tanpa langsung diberi jawaban.
- AC1: Parser berbasis aturan mengekstrak bilangan, tanda, dan jenis soal, lalu meminta siswa mengonfirmasi bagian yang tidak pasti.
- AC2: Setelah dikonfirmasi, soal dikerjakan dengan Pemandu 4 Langkah dan petunjuk 3 tingkat yang sama (kebijakan tanpa jawaban berlaku).
- AC3: Jika parser gagal, tersedia pembangun model manual.

### F-11 Catatan Pribadi
**US-11** Sebagai siswa, saya ingin membuat catatan sendiri di setiap pelajaran seperti di buku tulis.
- AC1: Catatan teks (≤ 2.000 karakter) tersimpan per pelajaran dan dapat diakses dari menu "Catatanku".
- AC2: Siswa dapat menyalin worked example ke catatan dengan satu ketukan.

### F-12 Progres
**US-12** Sebagai siswa, saya ingin melihat sejauh mana saya sudah belajar.
- AC1: Peta modul menampilkan status (belum, sedang, selesai) dan tingkat penguasaan (0–100%).
- AC2: Ringkasan modul berisi 3–5 poin inti (rangkuman visual).

### F-13 Dasbor Guru
**US-13** Sebagai guru, saya ingin melihat progres kelas dan topik tersulit.
- AC1: Guru dapat membuat kelas dan mendapatkan kode kelas.
- AC2: Tabel siswa menampilkan modul yang selesai, tingkat penguasaan, dan waktu belajar.
- AC3: Grafik menampilkan 5 jenis kesalahan atau miskonsepsi tersering di kelas.
- AC4: Guru tidak dapat melihat isi catatan pribadi siswa.

### F-14 Kuesioner Beban Kognitif
**US-14** Sebagai peneliti, saya ingin mengumpulkan persepsi beban kognitif siswa setelah modul.
- AC1: Kuesioner opsional berisi 10 butir skala 0–10 (adaptasi Leppink dkk., 2013) muncul setelah modul selesai.
- AC2: Data dapat diekspor ke CSV oleh admin.

### F-15 Mode Offline
**US-15** Sebagai siswa dengan kuota terbatas, saya ingin tetap bisa belajar tanpa internet.
- AC1: Konten modul yang sudah dibuka tersimpan di cache.
- AC2: Jawaban yang dibuat saat offline masuk antrean dan disinkronkan saat koneksi kembali.

## 8. Persyaratan Non-Fungsional

| Kategori | Persyaratan |
|---|---|
| Performa | First Contentful Paint < 2,5 detik di 4G. Ukuran bundle awal < 300 KB gzip. Respons API p95 < 500 ms |
| Kompatibilitas | Android 8.0 (API 26) ke atas, Chrome/Edge/Firefox/Safari 2 versi terakhir, lebar layar ≥ 360 px |
| Aksesibilitas | WCAG 2.1 AA: kontras ≥ 4,5:1, target sentuh ≥ 44×44 px, informasi tidak hanya disampaikan lewat warna (tanda +/− tetap ditulis) |
| Bahasa | Bahasa Indonesia sederhana, kalimat ≤ 15 kata |
| Keamanan | HTTPS, RLS Supabase, JWT diverifikasi di backend, tanpa secret di klien |
| Privasi | Data minimal, sesuai UU No. 27/2022 tentang Pelindungan Data Pribadi; lihat [KEAMANAN-PRIVASI.md](KEAMANAN-PRIVASI.md) |
| Ketersediaan | Target uptime 99% selama periode uji coba |
| Pemeliharaan | Konten (pelajaran, soal, glosarium) dikelola sebagai data, bukan kode |

## 9. Metrik Keberhasilan

| Metrik | Target MVP | Cara ukur |
|---|---|---|
| N-gain pre/post-test | ≥ 0,3 | Tes 15 soal sebelum dan sesudah |
| Skor beban ekstrinsik | Lebih rendah dari kelompok pembanding | Kuesioner F-14 |
| Penyelesaian modul | ≥ 60% siswa menyelesaikan modul 1–3 | Tabel `progress` |
| Kegunaan (SUS) | ≥ 68 | Kuesioner System Usability Scale |
| Pemakaian petunjuk | Menurun dari topik awal ke akhir | Tabel `attempt_steps` |
| N-gain literasi matematika | ≥ 0,3 | Tes literasi gaya AKM (pre/post) |
| Level literasi "Cakap" atau lebih | Naik ≥ 20 poin persen | Misi Literasi per modul |
| Soal diselesaikan sendiri | ≥ 80% percobaan berstatus `correct` (bukan `deferred`) | Tabel `attempts` |

## 10. Asumsi dan Ketergantungan
- Siswa memiliki akses ke HP Android atau komputer dengan browser modern.
- Sekolah atau guru bersedia bekerja sama untuk uji coba.
- Supabase paket gratis cukup untuk skala uji coba (< 500 pengguna).
- Konten mengacu pada Buku Siswa Matematika Kelas VII (K-13) dan CP Kurikulum Merdeka Fase D.

## 11. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Temuan hanya dari 1 narasumber (n=1) | Kebutuhan bisa bias | Validasi dengan 3–5 siswa tambahan dan 1 guru sebelum sprint 3 |
| Koneksi internet siswa terbatas | Pemakaian rendah | PWA offline (F-15), aset ringan |
| Waktu pengembangan terbatas (tugas kuliah) | Fitur tidak selesai | Prioritas MoSCoW; fitur C/W ditunda |
| Animasi garis bilangan lambat di HP murah | Pengalaman buruk | SVG ringan, uji di perangkat low-end |
| Data anak di bawah umur | Masalah hukum/etika | Persetujuan orang tua/sekolah, data minimal |
| Siswa tetap sekadar menghafal pola | Tujuan G3 gagal | Variasi struktur soal (F-09 AC3), rotasi posisi yang tidak diketahui (F-20 AC2), pertanyaan refleksi (F-08 AC2) |
| Siswa frustrasi karena jawaban tidak pernah diberikan | Siswa berhenti memakai aplikasi | Petunjuk bertingkat yang konkret, Soal Kembar, Antrean Ulang, nada positif, pantau tingkat `deferred` per topik |
| Konten Misi Literasi butuh waktu banyak | Jadwal mundur | Mulai dengan 1 misi per modul; gunakan templat stimulus yang dapat dipakai ulang |

## 12. Rencana Rilis

| Rilis | Isi | Target |
|---|---|---|
| Alpha | F-01, F-03, F-04, F-05, F-19 sebagian (termometer, keping) — modul 1–2 | Akhir Sprint 2 |
| Beta | + F-06–F-10, F-20, F-19 lengkap, modul 3–6 | Akhir Sprint 4 |
| MVP / Uji Coba | + F-11–F-15, F-21, APK Android | Akhir Sprint 5 |
| Pasca-MVP | F-16, F-17, F-22 | Setelah evaluasi |

Detail jadwal ada di [ROADMAP.md](ROADMAP.md).

## 13. Pertanyaan Terbuka
1. Uji coba akan dilakukan di sekolah mana, dan dengan berapa siswa?
2. Apakah perlu kelompok pembanding (kelas kontrol) untuk evaluasi?
3. Apakah login Google diperbolehkan oleh sekolah untuk akun siswa?
4. Nama akhir aplikasi?

### F-23 Ujian Akhir (Should)
- Terbuka setelah semua pelajaran selesai. Berisi **12 soal** dalam 3 tahap berurutan: **Dasar** (4, level 1), **Menengah** (4, level 2), **Tingkat Tinggi/HOTS** (4, level 3).
- Soal diambil dari **bank soal khusus ujian** (`pool: "exam"` di `templates.json`): narasi baru dan rentang angka lebih lebar. Template ujian tidak pernah dipakai di latihan pelajaran dan tidak pernah menjadi Soal Kembar latihan.
- Rencana ujian adalah fungsi murni dari `seed` (dapat direproduksi). Setiap kali "Ulangi" memakai seed baru.
- Prinsip F-10 tetap berlaku: tanpa timer, jawaban tidak pernah ditunjukkan, petunjuk 3 tingkat dan Soal Kembar tetap tersedia. Nilai 0–100 = rata-rata bobot mastery (§6.4 DESAIN-PEDAGOGIS). Soal yang ditunda masuk Antrean Ulang.
