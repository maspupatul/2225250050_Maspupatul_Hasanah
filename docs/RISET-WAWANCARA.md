# Sintesis Riset: Wawancara Beban Kognitif

## 1. Metadata Wawancara

| Informasi | Isi |
|---|---|
| Narasumber | Siswa (inisial R), Kelas VIII |
| Tanggal | 06 November 2026 |
| Pewawancara | Maspupatul Hasanah |
| Materi | Bilangan Bulat |
| Bukti belajar | Buku tulis berisi catatan materi |
| Durasi | 40 menit, direkam dengan persetujuan narasumber |
| Mode | Daring (video call) |
| Artefak pemicu | Buku Siswa Matematika Kelas VII SMP/MTs Kurikulum 2013; soal pemantik "Contoh 1.5": penyelam di kedalaman laut |
| Kerangka analisis | Cognitive Load Theory (Sweller): IL = intrinsic, EL = extraneous, GL = germane, K = konteks/prasyarat |

> Catatan etika: di dokumen pengembangan, identitas siswa cukup ditulis dengan inisial atau kode. Nama lengkap dan foto tidak dimasukkan ke repositori kode.

## 2. Ringkasan Temuan per Kode

### K — Konteks dan Prasyarat
| Kode | Kutipan (diringkas) | Interpretasi |
|---|---|---|
| K01 | "Materi ini pernah dipelajari pas SD tapi tidak sesusah ini; di SMP materinya lebih banyak." | Materi terasa banyak dan rumit, terjadi lonjakan dari SD ke SMP. |
| K02 | "Guru menjelaskan dengan menulis di papan tulis dan memberikan beberapa contoh soal." | Pembelajaran berpusat pada guru dan memakai representasi abstrak. |

### IL — Beban Intrinsik
| Kode | Kutipan | Interpretasi |
|---|---|---|
| IL1 | "Di soal cerita saya kurang paham bagaimana mengerjakannya." | Siswa tahu prosedur, tetapi tidak memahami makna konsep. |
| IL2 | "Liat rumusnya aja." | Siswa terpaku pada rumus sebagai langkah awal. |
| IL3 | "Penjumlahan, pengurangan, perkalian dan pembagian." | Operasi hitung dasar adalah prasyarat yang harus dikuasai. |

### EL — Beban Ekstrinsik
| Kode | Kutipan | Interpretasi |
|---|---|---|
| EL1 | "Bahasanya kurang saya pahami ketika soal cerita dan kadang bingung apa yang ditanyakan." | Sulit menentukan langkah dari teks soal. |
| EL2 | "Guru hanya menjelaskan di papan tulis… tidak ada contoh langsung, misal di garis bilangan." | Siswa membutuhkan representasi konkret atau visual. |
| EL3 | "Penjelasan guru kadang terlalu cepat… baru paham satu hal, penjelasan sudah ke hal lain." | Siswa membutuhkan penjelasan yang runtut dengan tempo terkendali. |

### GL — Beban Germane (strategi belajar)
| Kode | Kutipan | Interpretasi |
|---|---|---|
| GL1 | "Saya membuat catatan di buku… dan menanyakan hal yang tidak saya pahami kepada teman." | Mencatat dan berdiskusi membantu pemahaman. |
| GL2 | "Saya lihat contoh soal yang mirip… biasanya sama polanya tapi beda angkanya." | Siswa mengandalkan contoh soal (worked example). |
| GL3 | "Saya menggunakan contoh soal serupa… untuk menyelesaikan soal lain secara mandiri." | Siswa mentransfer pola dari soal yang sudah dikerjakan. |

## 3. Insight Utama

1. **Masalah utama ada pada penyajian, bukan kemampuan.** Empat dari sebelas temuan (K02, EL1, EL2, EL3) berkaitan dengan cara materi disampaikan. Ini adalah area yang paling dapat diperbaiki oleh aplikasi.
2. **Soal cerita adalah titik paling sulit.** IL1 dan EL1 sama-sama menunjuk ke kesulitan menerjemahkan bahasa sehari-hari menjadi kalimat matematika, terutama kata yang bermakna tanda negatif (mis. "di bawah permukaan laut").
3. **Representasi visual tidak tersedia.** Siswa sendiri yang menyebut garis bilangan (EL2). Ini kebutuhan eksplisit, bukan asumsi pengembang.
4. **Siswa sudah punya strategi belajar yang baik** (mencatat, belajar dari contoh, bertanya kepada teman). Aplikasi sebaiknya **memperkuat** kebiasaan ini, bukan menggantinya.
5. **Risiko hafalan pola.** GL2, GL3, dan IL2 menunjukkan bahwa transfer yang terjadi masih bersifat permukaan ("beda angkanya aja"). Aplikasi perlu mendorong pemahaman struktur, bukan sekadar meniru pola.

## 4. Matriks Keterlacakan (Temuan → Kebutuhan → Fitur)

| Temuan | Kebutuhan desain | Fitur (PRD) | Prinsip CLT |
|---|---|---|---|
| K01 | Materi dipecah kecil dan progres terlihat | F-04, F-12 | Segmenting, mengelola IL |
| K02 | Alternatif selain penjelasan papan tulis abstrak | F-05, F-13 | Modality, concreteness fading |
| IL1 | Panduan memahami makna soal cerita | F-06, F-08 | Worked example, scaffolding |
| IL2 | Menggeser fokus dari rumus ke konsep | F-09 (AC3), F-10 | Variability effect, self-explanation |
| IL3 | Memastikan prasyarat hitung dasar | F-03 | Pre-training |
| EL1 | Menjelaskan bahasa soal cerita dan apa yang ditanya | F-06, F-07 | Signaling, mengurangi split-attention |
| EL2 | Peragaan konkret pada garis bilangan | F-05 | Multimedia & contiguity |
| EL3 | Tempo dikendalikan siswa, materi runtut | F-04, F-10 | Learner-paced segmenting |
| GL1 | Mendukung pencatatan dan diskusi | F-11, F-16 | Generative learning |
| GL2 | Menyediakan contoh berpola yang mudah dirujuk | F-08, F-09 | Worked example effect |
| GL3 | Transfer ke soal baru secara mandiri | F-08 (faded), F-09 | Fading / completion problem |

Setiap kode temuan terpetakan ke minimal satu fitur Must atau Should.

### 4.1 Pemetaan Tambahan (v1.1)

Fitur berikut ditambahkan berdasarkan **tujuan pengembang** (literasi matematika dan pemahaman konsep), dan sekaligus memperkuat respons terhadap temuan wawancara:

| Temuan | Fitur tambahan | Alasan |
|---|---|---|
| IL1, EL1 | F-20 Mesin pemodelan, F-21 Misi Literasi | Kesulitan soal cerita adalah masalah literasi: merumuskan dan menafsirkan |
| IL2 | F-10 Petunjuk 3 tingkat tanpa jawaban, F-20 rotasi posisi yang tidak diketahui | Siswa tidak dapat lagi sekadar menyalin jawaban atau pola |
| EL2, K02 | F-19 Visual kontekstual (termometer, skala laut, lift, keping +/−, dll.) | Siswa meminta "contoh langsung", yang kini tersedia di banyak konteks |
| GL3 | F-10 Soal Kembar, F-22 Pemodel Bebas | Memperkuat transfer strategi ke soal baru |

> Catatan validasi: efek fitur literasi dan kebijakan tanpa jawaban terhadap frustrasi siswa perlu dicek pada wawancara tambahan dan uji prototipe (Bagian 6).

## 5. Keterbatasan

- **Ukuran sampel n = 1.** Temuan bersifat eksploratif dan belum dapat digeneralisasi.
- Wawancara dilakukan secara daring, sehingga observasi proses mengerjakan soal terbatas.
- Narasumber kelas VIII mengingat kembali materi kelas VII (*recall bias*).
- Koding dilakukan oleh satu peneliti, tanpa uji reliabilitas antar-penilai.

## 6. Rencana Validasi Lanjutan

| Kegiatan | Sasaran | Waktu |
|---|---|---|
| Wawancara tambahan dengan protokol yang sama | 3–5 siswa kelas VII/VIII dari sekolah berbeda | Sebelum Sprint 3 |
| Wawancara guru matematika | 1–2 guru | Sebelum Sprint 3 |
| Uji prototipe kertas/Figma (think-aloud) | 3 siswa | Sprint 1 |
| Koding ulang oleh rekan (*peer debriefing*) | Seluruh transkrip | Paralel |

Jika validasi menemukan kebutuhan baru, perbarui tabel di Bagian 4 dan prioritas di [PRD.md](PRD.md).
