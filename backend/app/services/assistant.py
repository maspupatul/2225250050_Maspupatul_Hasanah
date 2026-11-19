"""Tanya Asisten: a chat tutor that guides the thinking process (docs/DESAIN-PEDAGOGIS.md §0.7).

Pedagogy
- RMT mediator: probing questions, thinking tools (number line, thermometer, debts), naming the
  thinking action of the step; never a shortcut and never the answer.
- Cognitive load: one step and one question at a time (intrinsic), at most 3 short sentences
  in plain words that point to what is already on screen (extraneous), and the student is
  asked to explain or check their own reasoning (germane).
- Help grows with the difficulty the student shows, but never past one level above the hints
  the student has opened, so the hint weights for mastery (§6.4) stay fair.

Safety
- Gemini never receives the answer. Every reply passes the same guard as Smart Hint
  (ai_hint.is_safe); an unsafe or failed reply becomes the static hint for the same level.
- Names, usernames, e-mail addresses and phone numbers are removed before anything is sent.
- No chat is stored: the client sends the last few messages, the server forgets them after
  replying. Only a per-attempt question counter is kept (to protect the quota).
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Literal

from app.core.config import settings
from app.core.errors import AppError
from app.services import ai_hint
from app.services.modeling.hint_generator import make_hint

log = logging.getLogger("zmath.assistant")

MAX_MESSAGES = 6  # recent turns the model sees
MAX_TEXT = 300  # characters per message
TURN_LIMIT = 20  # questions per problem
Role = Literal["siswa", "asisten"]

STEP_GOALS = {
    "known": "langkah Pahami: menemukan bilangan yang diketahui beserta tandanya",
    "asked": "langkah Ditanya: menemukan apa yang ditanyakan",
    "model": "langkah Buat Model: menyusun kalimat matematika",
    "result": "langkah Hitung: menghitung hasil kalimat matematika",
    "interpret": "langkah Tafsirkan & Periksa: menjelaskan arti hasil dalam cerita dan kewajarannya",
}
STEP_FUNCTIONS = ai_hint.STEP_FUNCTIONS | {
    "interpret": "memberi bukti logis: apakah hasilnya masuk akal dalam cerita",
}
SUPPORT_RULES = {
    1: "Bantuan Makna: bantu memahami arti kata atau konteks. Tanyakan satu hal kecil.",
    2: "Bantuan Visual: ajak memakai garis bilangan atau gambar di layar, sebut titik mulai "
    "dan arah saja, jangan tempat berhentinya.",
    3: "Bantuan Strategi: bantu merencanakan langkah pertama saja, tanpa hasil hitungan. "
    "Kalimat matematika boleh, asal masih ada kotak kosong □.",
}

SYSTEM_PROMPT = """Kamu adalah Asisten Belajar di aplikasi Z-Math untuk siswa kelas VII SMP \
(bab Bilangan Bulat). Peranmu pembimbing proses berpikir matematis, bukan pemberi jawaban.

Model belajar Rigorous Mathematical Thinking (RMT):
- Bertindak sebagai mediator: ajukan pertanyaan pemantik yang membuat siswa teliti.
- Dorong siswa memakai alat berpikir: garis bilangan, termometer, kedalaman laut, skor, \
utang-piutang.
- Sebut tindakan berpikirnya dengan kata sederhana, misalnya memberi tanda, membandingkan, \
memberi bukti.
- Hubungkan dengan langkah sebelumnya dan ajak siswa menjelaskan alasannya.

Literasi matematika, empat langkah: Pahami (Diketahui), Ditanya, Buat Model, Hitung lalu Tafsirkan.
Bimbing HANYA langkah yang sedang aktif. Jika siswa bertanya tentang langkah lain, \
arahkan kembali ke langkah aktif dengan ramah.

Kelola beban kognitif:
- Beban intrinsik: satu langkah kecil dan satu pertanyaan saja dalam setiap balasan.
- Beban ekstrinsik: paling banyak tiga kalimat, setiap kalimat paling banyak lima belas kata, \
kata sehari-hari, tanpa istilah baru yang tidak dijelaskan.
- Beban germane: minta siswa menjelaskan alasan atau memeriksa caranya sendiri.

Aturan wajib:
- DILARANG KERAS memberikan jawaban akhir atau hasil sementara, baik dengan angka maupun kata.
- Jangan membenarkan atau menyalahkan tebakan angka siswa. Minta siswa memeriksanya \
dengan alat atau dengan tombol Periksa.
- Hanya boleh menulis angka yang sudah ada di soal.
- Jika siswa meminta jawaban, tolak dengan ramah lalu tawarkan langkah berpikir berikutnya.
- Jika pertanyaan di luar soal ini, ajak kembali ke soal dengan ramah.
- Jangan menanyakan atau menyebut data pribadi.
- Nada positif. Tanpa emoji, tanpa markdown, tanpa daftar bernomor.
- Bilangan positif artinya di atas nol, naik, untung. Bilangan negatif artinya di bawah nol, \
turun, rugi, utang."""

_CONFUSED = re.compile(
    r"\b(bingung|ga(k)? ?(tau|tahu|ngerti|paham)|(tidak|nggak|enggak|belum) (tahu|tau|ngerti|mengerti|paham)|"
    r"susah|sulit|menyerah|nyerah|stuck|buntu)\b",
    re.IGNORECASE,
)
_ASKS_ANSWER = re.compile(
    r"\b(jawaban(nya)?|kunci|hasil(nya)? berapa|berapa hasil(nya)?|kasih tahu|kasih tau|"
    r"benar (gak|tidak|nggak|ga)|bener (gak|ga|nggak))\b",
    re.IGNORECASE,
)
_EMAIL = re.compile(r"[\w.+-]+@[\w-]+(\.[\w-]+)+")
_PHONE = re.compile(r"\+?\d(?:[\s-]?\d){9,}")  # 10+ digits: no Bab 1 quantity is that long


@dataclass(frozen=True)
class Message:
    role: Role
    text: str


# ------------------------------------------------------------------ pure helpers


def scrub(text: str, private: list[str]) -> str:
    """Pure: remove names, usernames, e-mail addresses and phone numbers."""
    text = _EMAIL.sub("[data pribadi]", text)
    text = _PHONE.sub("[data pribadi]", text)
    words = sorted({w for p in private for w in [p, *p.split()] if len(w.strip()) >= 3}, key=len, reverse=True)
    for word in words:
        text = re.sub(rf"(?<!\w){re.escape(word.strip())}(?!\w)", "[nama]", text, flags=re.IGNORECASE)
    return text


def support_level(student_texts: list[str], hints_opened: int) -> int:
    """Pure: how concrete the help may be (1 Makna, 2 Visual, 3 Strategi).

    Grows with the number of questions and with signs of being stuck, but stays at most one
    level above the hints the student has opened (mastery weights stay honest)."""
    if not student_texts:
        return 1
    level = len(student_texts) + (1 if _CONFUSED.search(student_texts[-1]) else 0)
    return max(1, min(level, 3, hints_opened + 1))


def asks_for_answer(text: str) -> bool:
    return bool(_ASKS_ANSWER.search(text))


def build_prompt(
    *, problem_text: str, step: str, level: int, static_hint: str, messages: list[Message]
) -> str:
    """Pure: the user message for Gemini. Has no answer parameter on purpose."""
    lines = [
        f"Soal:\n{problem_text.strip()}",
        f"Langkah aktif: {STEP_GOALS.get(step, step)}.",
        f"Tindakan berpikir (fungsi kognitif RMT) yang dilatih: {STEP_FUNCTIONS.get(step, 'berpikir teliti')}.",
        SUPPORT_RULES[level],
        f"Arah bantuan dari guru (pakai isinya, jangan tambah hasil): {static_hint.strip()}",
    ]
    if messages and asks_for_answer(messages[-1].text):
        lines.append("Siswa meminta jawaban. Tolak dengan ramah, lalu ajukan satu pertanyaan pemandu.")
    transcript = "\n".join(f"{'Siswa' if m.role == 'siswa' else 'Asisten'}: {m.text}" for m in messages)
    lines.append(f"Percakapan terakhir:\n{transcript}")
    lines.append("Tulis balasan Asisten sekarang.")
    return "\n\n".join(lines)


# ------------------------------------------------------------------ service


def generate(prompt: str) -> str | None:  # swapped out in tests
    return ai_hint.generate_text(prompt, SYSTEM_PROMPT, settings.assistant_timeout_ms)


def reply(attempt_id: str, messages: list[Message], private: list[str]) -> dict:
    """Answer the student's last message for the active step of an open attempt."""
    from app.services import attempts  # late import: attempts imports ai_hint too

    attempt = attempts._open_attempt(attempt_id)
    if attempt.exam:
        raise AppError("ASSISTANT_OFF", "Asisten tidak tersedia saat Ujian Akhir.", 403)
    if not messages or messages[-1].role != "siswa":
        raise AppError("VALIDATION_ERROR", "Tulis pertanyaanmu dulu ya.", 400)
    if attempt.assistant_turns >= TURN_LIMIT:
        raise AppError(
            "ASSISTANT_LIMIT", "Kamu sudah banyak bertanya di soal ini. Coba buka petunjuk atau jawab dulu ya.", 429
        )
    attempt.assistant_turns += 1
    attempts._save(attempt)  # the count only; the chat text is never stored

    step = attempt.current_step
    recent = [Message(m.role, scrub(m.text[:MAX_TEXT], private)) for m in messages[-MAX_MESSAGES:]]
    level = support_level([m.text for m in recent if m.role == "siswa"], attempt.state(step).hint_level)
    static_hint = make_hint(attempts._hint_view(attempt), step, level)["text"]
    result = {
        "reply": static_hint,
        "source": "static",
        "step": step,
        "support_level": level,
        "turns_left": TURN_LIMIT - attempt.assistant_turns,
    }
    if not ai_hint.available():
        return result

    prompt = build_prompt(
        problem_text=attempt.text, step=step, level=level, static_hint=static_hint, messages=recent
    )
    guard = ai_hint.Guard(
        forbidden=attempts._forbidden_numbers(attempt),
        givens=frozenset(abs(v) for v in attempt.instance.givens.values()),
    )
    try:
        raw = generate(prompt)
    except Exception as exc:  # noqa: BLE001 - quota, timeout, offline: the static guidance stays
        ai_hint.note_failure(exc)
        return result
    text = ai_hint.clean(raw or "")
    if not text or not ai_hint.is_safe(text, guard, step):
        if text:
            log.info("Tanya Asisten dropped an unsafe reply (step=%s, level=%s)", step, level)
        return result
    return result | {"reply": text, "source": "ai"}
