# Spesifikasi API — Z-Math Backend (FastAPI)

- **Base URL**: `{API_BASE_URL}` = `https://api.bulatku.id/api/v1` (prod), `http://localhost:8000/api/v1` (dev)
- **Format**: JSON (UTF-8)
- **Autentikasi**: header `Authorization: Bearer <Supabase access_token>` pada semua endpoint kecuali `/health`
- **Dokumentasi interaktif**: `/docs` (Swagger), `/redoc`
- **Versi**: path `/api/v1`. Perubahan yang tidak kompatibel memakai `/api/v2`.

> Operasi CRUD sederhana yang dilindungi RLS (membaca konten yang dipublikasikan, mengelola catatan) dapat dilakukan langsung dari frontend dengan `supabase-js`. API di bawah menangani logika yang harus tepercaya.

## 1. Format Error

```json
{
  "error": {
    "code": "CLASS_NOT_FOUND",
    "message": "Kode kelas tidak ditemukan. Coba cek lagi ya.",
    "details": null
  }
}
```

| HTTP | `code` | Arti |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Input tidak valid |
| 401 | `UNAUTHORIZED` | Token hilang, tidak valid, atau kedaluwarsa |
| 403 | `FORBIDDEN` | Peran tidak diizinkan |
| 404 | `NOT_FOUND`, `CLASS_NOT_FOUND`, `ATTEMPT_NOT_FOUND` | Data tidak ada |
| 409 | `ALREADY_MEMBER`, `ATTEMPT_CLOSED`, `HINT_LOCKED`, `NO_MORE_HINTS`, `TWIN_NOT_AVAILABLE` | Konflik status |
| 423 | `MODULE_LOCKED` | Prasyarat modul belum terpenuhi |
| 429 | `RATE_LIMITED` | Terlalu banyak permintaan |
| 500 | `INTERNAL_ERROR` | Kesalahan server |

Field `message` selalu berbahasa Indonesia yang ramah siswa, sehingga dapat ditampilkan langsung di UI.

## 2. Ringkasan Endpoint

| Method | Path | Peran | Fitur |
|---|---|---|---|
| GET | `/health` | publik | — |
| GET | `/me` | semua | F-01 |
| PATCH | `/me` | semua | F-01 |
| POST | `/classes` | teacher | F-13 |
| POST | `/classes/join` | student | F-02 |
| GET | `/modules` | semua | F-12 |
| GET | `/modules/{module_id}` | semua | F-04 |
| GET | `/lessons/{lesson_id}` | semua | F-04, F-08 |
| PUT | `/lessons/{lesson_id}/progress` | student | F-04, F-12 |
| GET | `/prerequisite/test` | student | F-03 |
| POST | `/prerequisite/submit` | student | F-03 |
| POST | `/practice/next` | student | F-09, F-23 |
| GET | `/exam` | semua | F-23 |
| POST | `/exam/start` | student | F-23 |
| POST | `/practice/attempts/{attempt_id}/steps` | student | F-06, F-10 |
| POST | `/practice/attempts/{attempt_id}/hint` | student | F-10 |
| POST | `/practice/attempts/{attempt_id}/twin` | student | F-10 |
| GET | `/practice/review-queue` | student | F-10 |
| POST | `/practice/attempts/sync` | student | F-15 |
| GET | `/literacy/missions?module_id=` | semua | F-21 |
| GET | `/literacy/missions/{mission_id}` | semua | F-21 |
| POST | `/modeler/parse` | semua | F-22 |
| POST | `/modeler/solve` | semua | F-22 |
| GET | `/glossary` | semua | F-07 |
| GET | `/progress` | student | F-12 |
| POST | `/surveys/cognitive-load` | student | F-14 |
| GET | `/teacher/classes` | teacher | F-13 |
| GET | `/teacher/classes/{class_id}/overview` | teacher | F-13 |
| GET | `/teacher/classes/{class_id}/misconceptions` | teacher | F-13 |
| GET | `/teacher/classes/{class_id}/literacy` | teacher | F-13, F-21 |
| GET | `/teacher/classes/{class_id}/deferred` | teacher | F-10, F-13 |
| GET | `/admin/surveys/export` | admin | F-14 |

## 3. Detail Endpoint

### 3.1 `GET /me`
**200**
```json
{ "id": "6f1c…", "display_name": "Raka", "role": "student", "grade": 7, "current_level": 1, "classes": [{ "id": "c1…", "name": "VII-A" }] }
```

### 3.2 `PATCH /me`
Request: `{ "display_name": "Raka", "grade": 7 }`. Field `role` tidak dapat diubah.

### 3.3 `POST /classes` (guru)
Request: `{ "name": "VII-A" }`
**201**: `{ "id": "c1…", "name": "VII-A", "join_code": "K7Q2MX" }`

### 3.4 `POST /classes/join`
Request: `{ "join_code": "K7Q2MX" }`
**200**: `{ "class_id": "c1…", "name": "VII-A" }`, atau **404** `CLASS_NOT_FOUND`, atau **409** `ALREADY_MEMBER`

### 3.5 `GET /modules`
**200**
```json
[
  { "id": "m1", "title": "Mengenal Bilangan Bulat", "order_no": 1, "locked": false, "status": "completed", "mastery": 0.85, "lesson_count": 3 },
  { "id": "m3", "title": "Penjumlahan & Pengurangan", "order_no": 3, "locked": true, "status": "not_started", "mastery": 0, "lesson_count": 4 }
]
```

### 3.6 `GET /lessons/{lesson_id}`
Mengembalikan pelajaran dengan `segments`. Pada segmen `faded_example`, field `answer` **dihapus**, dan jawaban dicek melalui alur practice (`context: "faded"`).
**423** `MODULE_LOCKED` jika prasyarat belum terpenuhi.

### 3.7 `PUT /lessons/{lesson_id}/progress`
Request: `{ "last_segment": 4, "completed_segments": true }`
**200**: `{ "status": "in_progress", "last_segment": 4, "mastery": 0.6 }`

### 3.8 `GET /prerequisite/test`
**200**
```json
{ "attempt_group_id": "pg1…", "items": [ { "attempt_id": "a1…", "operation": "+", "text": "37 + 48 = ?" } ] }
```

### 3.9 `POST /prerequisite/submit`
Request: `{ "answers": [ { "attempt_id": "a1…", "answer": 85 } ] }`
**200**
```json
{ "score": { "+": 2, "-": 2, "x": 1, ":": 2 }, "remedial": ["remedial-multiplication"], "message": "Bagus! Yuk, ulang sebentar perkalian sebelum mulai." }
```

### 3.10 `POST /practice/next`
Request:
```json
{ "lesson_id": "m6-t1", "context": "practice", "guided": true }
```
**200** (tanpa kunci jawaban)
```json
{
  "attempt_id": "at_91…",
  "template_id": "story-diver-01",
  "level": 1,
  "kind": "story",
  "text": "Seorang penyelam berada 4 meter di bawah permukaan laut. Ia menyelam 3 meter lebih dalam. Di kedalaman berapa ia sekarang?",
  "keywords": [
    { "phrase": "di bawah permukaan laut", "sign": "-", "start": 32, "end": 55 },
    { "phrase": "lebih dalam", "sign": "-", "start": 77, "end": 88 }
  ],
  "guided": true,
  "schema_type": "CHG",
  "steps": [
    { "key": "known", "prompt": "Apa saja yang diketahui?", "input": "number_chips", "options": ["4", "-4", "3", "-3"] },
    { "key": "asked", "prompt": "Apa yang ditanyakan?", "input": "choice", "options": ["Posisi akhir penyelam", "Jarak yang ditempuh", "Kedalaman laut"] },
    { "key": "model", "prompt": "Susun kalimat matematikanya.", "input": "expression_builder" },
    { "key": "result", "prompt": "Berapa hasilnya?", "input": "integer" },
    { "key": "interpret", "prompt": "Apa arti hasilmu dalam cerita ini?", "input": "interpretation_builder" }
  ],
  "visual": { "kind": "sea_depth", "unit": "m", "range": [-20, 5], "start": -4, "steps": [], "showEnd": false, "mode": "explore" },
  "hints_per_step": 3
}
```
Jika `guided: false`, hanya satu langkah `answer` yang dikembalikan.

### 3.11 `POST /practice/attempts/{attempt_id}/steps`
Request: `{ "step": "result", "answer": 7 }`
**200** (salah, miskonsepsi terdeteksi). Umpan balik **tidak** memuat jawaban benar:
```json
{
  "correct": false,
  "misconception": "sign_error",
  "feedback": "Hampir! Penyelam turun dua kali. Apakah posisinya makin dalam atau makin dekat ke permukaan?",
  "next_step_unlocked": false,
  "attempt_status": "open",
  "next_hint_level": 1,
  "hint_available": true,
  "twin_available": false
}
```
**200** (benar, langkah `result`)
```json
{
  "correct": true,
  "feedback": "Tepat! Kamu menemukannya sendiri. 🎉",
  "next_step_unlocked": true,
  "attempt_status": "open"
}
```
**200** (benar, langkah terakhir `interpret`). Baru di titik ini pembahasan dikirim:
```json
{
  "correct": true,
  "feedback": "Hebat! Penyelam berada 7 meter di bawah permukaan laut.",
  "attempt_status": "correct",
  "review": {
    "model": "(-4) + (-3)",
    "trace": [ { "expr": "(-4) + (-3)", "result": -7, "explain": "Tanda sama: jumlahkan, tanda tetap negatif." } ],
    "visual": { "kind": "sea_depth", "unit": "m", "start": -4, "steps": [{ "op": "+", "value": -3 }], "showEnd": true, "mode": "review" },
    "reflection": "Mengapa hasilnya negatif?"
  },
  "mastery": 0.72,
  "level_change": null,
  "badges_earned": []
}
```
**409** `ATTEMPT_CLOSED` jika percobaan sudah selesai.

**Aturan Soal Kembar dan penundaan:** setelah Petunjuk 3 dibuka dan siswa salah 2 kali lagi pada langkah yang sama, respons berisi `"twin_available": true`. Jika siswa masih salah setelah melihat Soal Kembar, respons berisi `"attempt_status": "deferred"`, soal masuk `review_queue`, dan **jawaban tidak dikirim**:
```json
{
  "correct": false,
  "attempt_status": "deferred",
  "feedback": "Tidak apa-apa, soal ini kita simpan dulu. Nanti kamu akan mencobanya lagi dengan angka yang berbeda. 💪",
  "review_due_at": "2026-11-21T00:00:00Z"
}
```

### 3.12 `POST /practice/attempts/{attempt_id}/hint`
Request: `{ "step": "model" }`

**200**: petunjuk tingkat berikutnya untuk langkah tersebut
```json
{
  "step": "model",
  "hint_level": 2,
  "kind": "visual",
  "text": "Lihat penyelamnya. Ke arah mana ia bergerak?",
  "visual": { "kind": "sea_depth", "unit": "m", "start": -4, "steps": [{ "op": "?", "value": null, "label": "lebih dalam 3" }], "showEnd": false, "mode": "hint" },
  "hints_remaining": 1
}
```

| `hint_level` | `kind` | Isi |
|---|---|---|
| 1 | `meaning` | Pertanyaan pemandu atau makna kata kunci |
| 2 | `visual` | `VisualScript` mode `hint` (`showEnd: false`) |
| 3 | `strategy` | Kerangka dengan kotak kosong, mis. `"template": "(−4) + (□) = ?"` |

**409** `HINT_LOCKED`: siswa belum mencoba menjawab sejak petunjuk sebelumnya ("Coba jawab dulu ya, lalu buka petunjuk berikutnya.").
**409** `NO_MORE_HINTS`: ketiga petunjuk sudah dibuka.

> **Jaminan server:** respons petunjuk dibuat oleh `hint_generator` yang tidak menerima hasil akhir. Middleware test memastikan nilai hasil tidak muncul di `text`, `template`, maupun `visual`.

### 3.12a `POST /practice/attempts/{attempt_id}/twin`
Tersedia hanya jika `twin_available: true`. Selain itu server mengembalikan **409** `TWIN_NOT_AVAILABLE`.
**200**: worked example isomorfik (jenis skema sama, **konteks dan angka berbeda**)
```json
{
  "twin": {
    "text": "Suhu di sebuah kota −2 °C. Malam hari suhu turun lagi 4 °C. Berapa suhunya sekarang?",
    "steps": [
      { "key": "known", "content": "−2 dan turun 4 → −4", "why": "Kata 'turun' berarti negatif." },
      { "key": "model", "content": "(−2) + (−4)", "why": "Suhu awal + perubahan." },
      { "key": "result", "content": "−6", "why": "Tanda sama: jumlahkan, tanda tetap negatif." },
      { "key": "interpret", "content": "6 °C di bawah nol", "why": "Hasil negatif berarti di bawah nol." }
    ],
    "visual": { "kind": "thermometer", "unit": "°C", "start": -2, "steps": [{ "op": "+", "value": -4 }], "showEnd": true, "mode": "guided" }
  },
  "message": "Pelajari contoh ini, lalu coba lagi soalmu dengan cara yang sama."
}
```
Server memastikan hasil Soal Kembar ≠ hasil soal asli.

### 3.12b `GET /practice/review-queue`
**200**: `[ { "id": "rq1…", "template_id": "story-diver-01", "due_at": "2026-11-21T00:00:00Z" } ]`
Soal dari antrean yang sudah jatuh tempo otomatis diprioritaskan oleh `POST /practice/next` (dengan `seed` baru).

### 3.13 `POST /practice/attempts/sync` (offline, F-15)
Request: `{ "items": [ { "client_id": "uuid", "attempt_id": "…", "step": "result", "answer": -7, "answered_at": "2026-11-20T08:00:00Z" } ] }`
**200**: `{ "results": [ { "client_id": "uuid", "correct": true } ] }`

> Untuk mode offline, frontend menyimpan **paket soal pra-generate** (soal + hash jawaban, bukan jawaban asli) agar siswa tetap mendapat umpan balik benar/salah. Umpan balik miskonsepsi rinci diberikan setelah sinkronisasi.

### 3.13a `GET /literacy/missions/{mission_id}` (F-21)
**200**: stimulus + daftar soal (tanpa kunci jawaban). Setiap soal dikerjakan melalui alur `/practice` dengan `context: "literacy"`.
```json
{
  "id": "lm-m2-01",
  "title": "Suhu Kota Dunia di Bulan Januari",
  "stimulus": {
    "kind": "table",
    "caption": "Data ilustratif",
    "columns": ["Kota", "Terendah (°C)", "Tertinggi (°C)"],
    "rows": [["Moskow", -10, -4], ["Tokyo", 1, 10], ["Jakarta", 24, 31], ["Toronto", -9, -1]]
  },
  "items": [
    { "template_id": "lm-m2-01-q1", "cognitive_level": "understanding", "format": "multiple_choice" },
    { "template_id": "lm-m2-01-q2", "cognitive_level": "application", "format": "short_answer" },
    { "template_id": "lm-m2-01-q5", "cognitive_level": "reasoning", "format": "reason_choice" }
  ]
}
```

### 3.13b `POST /modeler/parse` (F-22)
Request: `{ "text": "Suhu di Dieng pagi hari -2 derajat. Siang hari naik 9 derajat. Berapa suhu siang hari?" }`
**200**: draf skema, tanpa hasil
```json
{
  "schema_type": "CHG",
  "unknown": "end",
  "context": "temperature",
  "quantities": [
    { "value": -2, "phrase": "-2 derajat", "role": "start", "confidence": 0.95 },
    { "value": 9, "phrase": "naik 9 derajat", "sign_keyword": "naik", "role": "change", "confidence": 0.9 }
  ],
  "question": "Berapa suhu siang hari",
  "needs_confirmation": ["schema_type"],
  "message": "Aku menemukan 2 bilangan. Apakah tandanya sudah benar?"
}
```

### 3.13c `POST /modeler/solve` (F-22)
Request: draf skema yang **sudah dikonfirmasi siswa**.
**200**: membuat `attempt` dengan `context: "free_model"` lalu mengembalikan respons seperti `/practice/next`. Jawaban tetap tidak dikirim.

### 3.14 `GET /glossary`
**200**: `[ { "phrase": "di bawah permukaan laut", "sign": "-", "explanation": "…" } ]`

### 3.15 `GET /progress`
**200**: `{ "overall_mastery": 0.54, "modules": [ { "id": "m1", "status": "completed", "mastery": 0.85, "lessons": [ … ] } ], "badges": ["first-step"] }`

### 3.16 `POST /surveys/cognitive-load`
Request: `{ "module_id": "m3", "responses": { "q1": 3, "q2": 2, "…": 0, "q10": 8 } }`. Nilai harus berupa bilangan bulat 0–10.
**201**: `{ "id": "s1…" }`. Skor IL/EL/GL dihitung di server.

### 3.17 `GET /teacher/classes/{class_id}/overview`
**200**
```json
{
  "class": { "id": "c1…", "name": "VII-A", "student_count": 28 },
  "students": [
    { "id": "…", "display_name": "Raka", "modules_completed": 3, "overall_mastery": 0.78, "minutes_spent": 95, "last_active": "2026-11-20T09:00:00Z" }
  ],
  "lessons_difficulty": [ { "lesson_id": "m3-t3", "title": "Pengurangan sebagai penjumlahan lawan", "avg_mastery": 0.41 } ]
}
```

### 3.18 `GET /teacher/classes/{class_id}/misconceptions`
**200**: `[ { "misconception": "sub_negative", "label": "Mengurangi bilangan negatif", "count": 57, "students_affected": 14 } ]`

### 3.18a `GET /teacher/classes/{class_id}/literacy`
**200**
```json
{
  "processes": { "formulate": 0.58, "employ": 0.74, "interpret": 0.49 },
  "indicators": [ { "code": "LM7", "label": "Mengevaluasi kewajaran hasil", "avg": 0.41 } ],
  "levels": { "perlu_intervensi": 4, "dasar": 9, "cakap": 11, "mahir": 4 }
}
```

### 3.18b `GET /teacher/classes/{class_id}/deferred`
**200**: daftar soal yang ditunda per siswa, sebagai bahan bimbingan langsung oleh guru.
`[ { "student": "Sinta", "template_id": "story-diver-01", "schema_type": "CHG", "misconception": "keyword_sign", "deferred_at": "…" } ]`

### 3.19 `GET /admin/surveys/export`
**200** `text/csv`. Kolom: `student_hash, module_id, q1..q10, il_score, el_score, gl_score, created_at` (data dianonimkan).

## 4. Kode Miskonsepsi

| Kode | Label |
|---|---|
| `sign_error` | Tanda hasil salah |
| `abs_sum` | Menjumlahkan nilai mutlak padahal tanda berbeda |
| `sub_negative` | Salah saat mengurangi bilangan negatif |
| `mult_sign` | Salah aturan tanda perkalian/pembagian |
| `compare_order` | Salah membandingkan bilangan negatif |
| `keyword_sign` | Salah menerjemahkan kata kunci menjadi tanda |
| `operation_choice` | Salah memilih operasi pada soal cerita |
| `missing_quantity` | Model tidak memakai semua kuantitas penting |
| `extra_quantity` | Model memakai bilangan yang tidak relevan |
| `unknown_position` | Salah menempatkan bilangan yang tidak diketahui (mis. menghitung akhir padahal ditanya awal) |
| `interpret_error` | Salah menafsirkan hasil ke konteks (mis. −7 ditafsirkan "7 m di atas laut") |
| `other` | Tidak teridentifikasi |

## 5. Contoh Implementasi Dependency Auth (acuan)

```python
# backend/app/core/security.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.core.config import settings

bearer = HTTPBearer()

def get_current_user(cred: HTTPAuthorizationCredentials = Depends(bearer)) -> dict:
    try:
        payload = jwt.decode(
            cred.credentials,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="UNAUTHORIZED")
    return {"id": payload["sub"], "email": payload.get("email")}
```

> Catatan: jika proyek Supabase memakai *asymmetric JWT signing keys* (RS256/ES256), verifikasi memakai JWKS dari `{SUPABASE_URL}/auth/v1/.well-known/jwks.json` sebagai pengganti secret.

## 6. Rate Limit

| Endpoint | Batas |
|---|---|
| `/practice/*` | 60 permintaan/menit per pengguna |
| `/modeler/*` | 20 permintaan/menit per pengguna |
| `/classes/join` | 10 permintaan/menit per pengguna (mencegah tebak kode) |
| Lainnya | 120 permintaan/menit per pengguna |

## 7. Ujian Akhir (F-23, Tahap 1 sudah diimplementasikan)

### 7.1 `GET /exam`
Susunan ujian: `{ id, title, total, stages: [{ key, title, level, count }] }`.

### 7.2 `POST /exam/start`
Body opsional `{ "seed": int }`. Respons = isi `GET /exam` + `seed` + `items: [{ index, stage, stage_title, stage_number, level }]`. Tidak berisi `template_id` atau jawaban.

### 7.3 Soal ujian lewat `POST /practice/next`
Body `{ "exam_seed": int, "exam_index": int, "guided": bool }`. Respons sama dengan soal latihan biasa, ditambah `exam: { index, stage, stage_title, stage_number, level, total }`. Langkah, petunjuk, dan soal kembar memakai endpoint `/practice/attempts/...` yang sama. `exam_index` di luar rentang → `404 NOT_FOUND`.

### Catatan `GET /modules` dan `GET /lessons/{id}`
Setiap ringkasan pelajaran berisi `order` (urutan di dalam modul) dan `number` (nomor global 1–10 di jalur Beranda). Semua layar menampilkan "Pelajaran {number}" agar nomornya selalu sama.
