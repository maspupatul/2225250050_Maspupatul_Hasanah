"""Smart Hint: Gemini rewrites a static hint into a friendlier one (docs/DESAIN-PEDAGOGIS.md §6.6).

The static hint from `hint_generator` is always produced first and stays the
fallback. Gemini only adds `ai_text`. Two independent guarantees keep F-10:

1. INPUT: Gemini only ever sees an `AIHintRequest`, which has no answer field
   (problem text, step, level, the static hint, the student's wrong answer).
2. OUTPUT: `is_safe` rejects any AI text that names the final answer or an
   intermediate result (as digits or as Indonesian words). Rejected text is
   dropped and the static hint is shown instead.

Every failure (no key, quota 429, timeout, offline, bad model) returns
`source="static"`, never an error. tests/test_ai_hint.py enforces all of this.
"""

from __future__ import annotations

import hashlib
import logging
import re
import threading
import time
from collections import OrderedDict
from collections.abc import Callable, Iterable, Sequence
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import TimeoutError as FutureTimeout
from dataclasses import dataclass

from app.core.config import settings

log = logging.getLogger("zmath.ai")

# Order of preference. Any model whose name contains "hydrogen" comes first.
PREFERRED_KEYWORD = "hydrogen"
FALLBACK_MODELS = ("gemini-3-flash-preview", "gemini-2.5-flash")
MAX_EXTRA_MODELS = 3  # other listed flash models used as a last safety net
NON_TEXT_HINTS = ("image", "tts", "audio", "live", "embedding", "omni")
THINKING_LEVELS = ("MINIMAL", "LOW", None)  # lowest first; None = model default
LIST_TIMEOUT_MS = 30000
GEMINI_MIN_DEADLINE_MS = 10000  # Gemini answers 400 to any request deadline below 10 s
MIN_CALL_MS = 1500
MAX_OUTPUT_TOKENS = 1024
MODEL_SHARE = 0.45  # share of the budget for the preferred model, so a fallback still has time
CACHE_SIZE = 2000
MAX_CHARS = 360
MAX_SENTENCES = 3
COOLDOWN_QUOTA_S = 60.0  # after 429
COOLDOWN_ERROR_S = 30.0  # after timeout / offline / 5xx
COOLDOWN_AUTH_S = 600.0  # after an invalid key
COOLDOWN_MODEL_S = 120.0  # one busy model (503/504/other) is skipped this long
COOLDOWN_SLOW_S = 600.0  # a model too slow for our time budget is skipped longer

STEP_TASKS = {
    "known": "menemukan bilangan yang diketahui beserta tandanya (+ atau −)",
    "asked": "menemukan apa yang ditanyakan soal",
    "model": "menyusun kalimat matematika dari cerita",
    "result": "menghitung hasil",
}

# RMT (Kinard & Kozulin, 2008): the cognitive function each step exercises. Named in the
# prompt so the hint mediates that thinking action instead of giving a shortcut.
STEP_FUNCTIONS = {
    "known": "mencari informasi secara teliti dan memberi label tanda (+ atau −)",
    "asked": "merumuskan masalah: apa tepatnya yang harus dicari",
    "model": "mengubah cerita ke bahasa matematika (encoding) dan membentuk hubungan antarbilangan",
    "result": "memakai garis bilangan sebagai alat berpikir dan memberi bukti logis",
}

LEVEL_RULES = {
    1: (
        "Petunjuk 1 (Makna). Mediasi makna: hubungkan kata di soal dengan pengalaman siswa. "
        "Pakai alat representasi yang dekat: suhu di termometer, kedalaman laut, skor game, "
        "atau utang-piutang uang saku. Akhiri dengan satu pertanyaan pemantik ketelitian, "
        "misalnya 'Kata mana yang menunjukkan arah atau tanda?'"
    ),
    2: (
        "Petunjuk 2 (Visual). Ajak siswa memakai garis bilangan sebagai alat berpikir: "
        "mulai dari mana, lalu ke arah mana (kanan/kiri, naik/turun). Jika ada beberapa operasi, "
        "tanyakan operasi mana yang dikerjakan lebih dulu. Jangan sebut tempat berhentinya. "
        "Akhiri dengan pertanyaan yang membuat siswa membandingkan atau memeriksa arah."
    ),
    3: (
        "Petunjuk 3 (Strategi). Bantu siswa merencanakan: beri langkah pertama saja, tanpa hasil "
        "hitungannya. Minta siswa menyiapkan bukti logis, misalnya 'Mengapa tandanya begitu?'. "
        "Jika memakai kalimat matematika, sisakan minimal satu kotak kosong □."
    ),
}

SYSTEM_PROMPT = """Kamu adalah mediator berpikir matematika untuk siswa kelas VII SMP \
di aplikasi Z-Math (Bab 1: Bilangan Bulat). Model belajarnya Rigorous Mathematical \
Thinking (RMT): kamu tidak mengajari trik cepat, tetapi menuntun siswa berpikir teliti.

Cara memediasi:
- Ajukan pertanyaan pemantik yang membuat siswa teliti dan mencari hubungan antar-konsep.
- Dorong siswa memakai alat berpikir: garis bilangan, termometer, kedalaman laut, skor, \
atau utang-piutang.
- Sebut tindakan berpikirnya dengan kata sederhana, misalnya membandingkan, memberi tanda, \
atau memberi bukti.
- Jangan memberi rumus hafalan atau trik cepat seperti "minus ketemu minus jadi plus".

Aturan wajib:
- Tulis 2 sampai 3 kalimat singkat dalam Bahasa Indonesia sederhana.
- Setiap kalimat paling banyak 15 kata. Pakai kata sehari-hari.
- DILARANG KERAS memberikan jawaban akhir, baik dengan angka maupun dengan kata.
- Jangan menghitung hasil apa pun, termasuk hasil sementara.
- Hanya boleh menulis angka yang sudah ada di soal.
- Jika jawaban siswa keliru, tunjukkan bagian berpikir yang perlu dicek, tanpa menyebut nilai yang benar.
- Nada positif. Jangan bilang siswa bodoh atau gagal.
- Tanpa emoji, tanpa markdown, tanpa daftar bernomor.
- Bilangan positif artinya di atas nol, naik, untung. Bilangan negatif artinya di bawah nol, turun, rugi, utang."""


@dataclass(frozen=True)
class AIHintRequest:
    """Everything Gemini may see. Deliberately has no `answer` field."""

    problem_text: str
    step: str
    level: int
    static_hint: str
    static_template: str | None = None
    student_answer: str | None = None

    def cache_key(self) -> tuple[str, str, int, str]:
        digest = hashlib.sha256(self.problem_text.encode("utf-8")).hexdigest()[:24]
        return (digest, self.step, self.level, (self.student_answer or "").strip())


@dataclass(frozen=True)
class Guard:
    """Numbers the AI text must not contain. Built by the caller, never sent to Gemini."""

    forbidden: frozenset[int]
    givens: frozenset[int]


def build_prompt(req: AIHintRequest) -> str:
    """Pure: the user message for Gemini."""
    lines = [
        f"Soal:\n{req.problem_text.strip()}",
        f"Siswa sedang di langkah: {STEP_TASKS.get(req.step, req.step)}.",
        f"Tindakan berpikir (fungsi kognitif RMT) yang dilatih: {STEP_FUNCTIONS.get(req.step, 'berpikir teliti')}.",
        LEVEL_RULES[req.level],
        f"Petunjuk dasar dari guru (boleh dibuat lebih ramah, isinya jangan ditambah hasil): "
        f"{req.static_hint.strip()}",
    ]
    if req.static_template:
        lines.append(f"Kerangka yang harus tetap punya kotak kosong: {req.static_template}")
    if req.student_answer:
        lines.append(f"Jawaban siswa yang masih keliru: {req.student_answer[:80]}")
    lines.append("Tulis petunjuknya sekarang.")
    return "\n\n".join(lines)


# ------------------------------------------------------------------ output guard

_UNITS = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan"]


def number_words(n: int) -> str:
    """Indonesian words for 0 ≤ n < 1_000_000 (enough for every Bab 1 problem)."""
    if n < 10:
        return _UNITS[n]
    if n == 10:
        return "sepuluh"
    if n == 11:
        return "sebelas"
    if n < 20:
        return f"{_UNITS[n - 10]} belas"
    if n < 100:
        tens, rest = divmod(n, 10)
        return f"{_UNITS[tens]} puluh" + (f" {_UNITS[rest]}" if rest else "")
    if n < 1000:
        hundreds, rest = divmod(n, 100)
        head = "seratus" if hundreds == 1 else f"{_UNITS[hundreds]} ratus"
        return head + (f" {number_words(rest)}" if rest else "")
    thousands, rest = divmod(n, 1000)
    head = "seribu" if thousands == 1 else f"{number_words(thousands)} ribu"
    return head + (f" {number_words(rest)}" if rest else "")


def numbers_in(text: str) -> set[int]:
    text = re.sub(r"(?<=\d)[.,](?=\d{3}\b)", "", text)  # 5.000 / 5,000 -> 5000
    return {int(n) for n in re.findall(r"\d+", text)}


def is_safe(text: str, guard: Guard, step: str) -> bool:
    """Pure: True if the AI text reveals no forbidden number (digits or words)."""
    shown = numbers_in(text)
    if shown & guard.forbidden:
        return False
    lowered = f" {text.lower()} "
    for n in guard.forbidden:
        if n < 1_000_000 and re.search(rf"(?<![a-z]){re.escape(number_words(n))}(?![a-z])", lowered):
            return False
    if step == "model" and len(guard.givens) >= 2 and guard.givens <= shown:
        return False  # all quantities in one sentence = a complete model, no empty box left
    return True


_EMOJI = re.compile("[\U0001f000-\U0001faff☀-➿️‍]")


def clean(text: str) -> str:
    """Pure: plain text, no emoji/markdown, at most 3 sentences and MAX_CHARS."""
    text = _EMOJI.sub("", text.replace("**", "").replace("*", "").replace("#", ""))
    text = re.sub(r"\s+", " ", text).strip()
    sentences = re.split(r"(?<=[.!?])\s+", text)
    text = " ".join(sentences[:MAX_SENTENCES]).strip()
    if len(text) > MAX_CHARS:
        cut = text[:MAX_CHARS].rsplit(" ", 1)[0]
        text = cut.rstrip(",;:") + "."
    return text


# ------------------------------------------------------------------ Gemini client

_lock = threading.Lock()  # quick state changes only, never held during network calls
_list_lock = threading.Lock()  # one model listing at a time (background thread)
_listing = False
_cache: OrderedDict[tuple[str, str, int, str], str] = OrderedDict()
_client = None  # google.genai.Client, created lazily
_models: list[str] | None = None
_models_listed = False  # False = chain is a guess; list again after _list_retry_at
_list_retry_at = 0.0
_paused_until = 0.0
_model_paused: dict[str, float] = {}  # model -> monotonic time it may be tried again
_thinking: dict[str, int] = {}  # model -> index in THINKING_LEVELS it accepts


def available() -> bool:
    return bool(settings.ai_hints and settings.gemini_api_key) and time.monotonic() >= _paused_until


def _pause(seconds: float, reason: str) -> None:
    global _paused_until
    _paused_until = time.monotonic() + seconds
    log.warning("Smart Hint paused for %.0fs: %s", seconds, reason)


def _error_code(exc: Exception) -> int | None:
    code = getattr(exc, "code", None) or getattr(exc, "status_code", None)
    return code if isinstance(code, int) else None


def _version(name: str) -> float:
    match = re.search(r"gemini-(\d+(?:\.\d+)?)", name)
    return float(match.group(1)) if match else 0.0


def rank_models(names: Iterable[str]) -> list[str]:
    """Pure: 'hydrogen' models first, then FALLBACK_MODELS in order (only if present), then a
    few other fast text models on this account as a safety net (lite first, newest first)."""
    short = list(dict.fromkeys(n.rsplit("/", 1)[-1] for n in names))  # models/x, publishers/.../x
    ranked = sorted((n for n in short if PREFERRED_KEYWORD in n.lower()), key=lambda n: ("preview" in n, n))
    ranked += [m for m in FALLBACK_MODELS if m in short and m not in ranked]
    extras = [
        n
        for n in short
        if "flash" in n and n not in ranked and not any(x in n for x in NON_TEXT_HINTS)
    ]
    extras.sort(key=lambda n: ("lite" not in n, -_version(n), n))
    return ranked + extras[:MAX_EXTRA_MODELS]


def _client_timeout_ms() -> int:
    """SDK timeout (per network phase) long enough for the slowest caller; each request is still
    capped by its own wall-clock budget in generate_text."""
    return max(settings.ai_timeout_ms, settings.assistant_timeout_ms)


def _make_client(vertex: bool, timeout_ms: int):  # noqa: ANN202 - google.genai.Client
    from google import genai
    from google.genai import types

    return genai.Client(
        api_key=settings.gemini_api_key,
        vertexai=vertex or None,
        http_options=types.HttpOptions(
            timeout=max(timeout_ms, GEMINI_MIN_DEADLINE_MS),
            # no hidden SDK retries on 503: our model chain moves on to the next model instead
            retry_options=types.HttpRetryOptions(attempts=1),
        ),
    )


def _list_models(client) -> list[str]:  # noqa: ANN001
    names = []
    for m in client.models.list():
        actions = getattr(m, "supported_actions", None)
        if actions is None or "generateContent" in actions:
            names.append(m.name or "")
    return names


def resolve_models() -> list[str]:
    """Pick the client and the ordered model chain (network: run it in the background).
    Lists models once; if listing failed, uses FALLBACK_MODELS and lists again later."""
    global _client, _models, _models_listed, _list_retry_at, _listing
    with _list_lock:
        try:
            if _models is not None and (_models_listed or time.monotonic() < _list_retry_at):
                return _models
            if settings.gemini_model:
                client, models, listed = _make_client(False, _client_timeout_ms()), [settings.gemini_model], True
            else:
                client, models, listed, errors = None, list(FALLBACK_MODELS), False, []
                for vertex in (False, True):  # AI Studio key first, then Vertex AI express key
                    try:
                        ranked = rank_models(_list_models(_make_client(vertex, LIST_TIMEOUT_MS)))
                    except Exception as exc:  # noqa: BLE001 - any failure falls back to the guess
                        errors.append(f"{'vertex' if vertex else 'gemini-api'}: {type(exc).__name__} {_error_code(exc)}")
                        continue
                    client, models, listed = _make_client(vertex, _client_timeout_ms()), ranked or models, True
                    log.warning("Smart Hint models (%s): %s", "vertex" if vertex else "gemini-api", models)
                    break
                if not listed:
                    log.warning("Smart Hint could not list models (%s); retrying later", "; ".join(errors))
                    client = _make_client(False, _client_timeout_ms())
            with _lock:
                _client, _models, _models_listed = client, models, listed
                if not listed:
                    _list_retry_at = time.monotonic() + COOLDOWN_QUOTA_S
            return models
        finally:
            _listing = False


def _models_for_request() -> list[str] | None:
    """Never blocks a student's request on model listing: starts it in the background and
    uses the current chain (None until the first listing finished → static hint)."""
    global _listing
    with _lock:
        stale = not _models_listed and time.monotonic() >= _list_retry_at and not _listing
        if stale:
            _listing = True
        current = _models
    if stale:
        threading.Thread(target=_safe_resolve, name="zmath-ai-models", daemon=True).start()
    return current


def _call(model: str, prompt: str, system: str = SYSTEM_PROMPT, max_tokens: int = MAX_OUTPUT_TOKENS) -> str | None:
    """One model. Uses the lowest thinking level the model accepts (fast answers)."""
    from google.genai import types

    for i in range(_thinking.get(model, 0), len(THINKING_LEVELS)):
        level = THINKING_LEVELS[i]
        config = types.GenerateContentConfig(
            system_instruction=system,
            temperature=0.4,
            max_output_tokens=max_tokens,
            thinking_config=types.ThinkingConfig(thinking_level=level) if level else None,
            # no per-request timeout: Gemini rejects deadlines under 10 s (400). The student's
            # wait is capped by _call_within instead.
        )
        try:
            response = _client.models.generate_content(model=model, contents=prompt, config=config)
        except Exception as exc:
            if _error_code(exc) == 400 and "thinking" in str(exc).lower() and i + 1 < len(THINKING_LEVELS):
                _thinking[model] = i + 1  # this model rejects that level: remember, try the next
                continue
            raise
        _thinking[model] = i
        return response.text
    return None


def _gemini_generate(req: AIHintRequest) -> str | None:
    return generate_text(build_prompt(req), SYSTEM_PROMPT)


def model_chain(models: list[str] | None, prefer: Sequence[str] = ()) -> list[str]:
    """Pure: the order to try models in. `prefer` (fast models for a caller that needs speed)
    goes first: only those this account lists, or all of them while the list is not known yet
    (a fresh server instance: a missing model answers 404 in a fraction of a second)."""
    if models is None:
        return list(prefer)
    first = [m for m in prefer if m in models]
    return first + [m for m in models if m not in first]


def generate_text(
    prompt: str,
    system: str,
    budget_ms: int | None = None,
    prefer: Sequence[str] = (),
    max_tokens: int = MAX_OUTPUT_TOKENS,
) -> str | None:
    """Walk the model chain within one time budget (ZMATH_AI_TIMEOUT_MS).

    The budget is a hard wall-clock limit: a student never waits longer. Each model except the
    last one gets about half of what is left, so a slow first model leaves time for the next.
    404 → model dropped for good. 503/504/timeout/empty → model skipped for a while, next one
    tried (no global pause). 429 (quota is per project) and network errors are raised at once.
    """
    models = _models_for_request()
    chain = model_chain(models, prefer)
    if not chain:
        return None
    deadline = time.monotonic() + (budget_ms or settings.ai_timeout_ms) / 1000
    candidates = [m for m in chain if _model_paused.get(m, 0.0) <= time.monotonic()]
    for i, model in enumerate(candidates):
        remaining_ms = int((deadline - time.monotonic()) * 1000)
        if remaining_ms < MIN_CALL_MS:
            break
        # the preferred model gets a share; fallbacks get whatever is left
        shared = model == chain[0] and i < len(candidates) - 1
        budget_ms = max(MIN_CALL_MS, int(remaining_ms * MODEL_SHARE)) if shared else remaining_ms
        try:
            text = _call_within(model, prompt, budget_ms, system, max_tokens)
        except Exception as exc:
            code = _error_code(exc)
            if code == 429 or _is_network_error(exc):
                raise
            with _lock:
                if code == 404 and models is not None and model in models and len(models) > 1:
                    models.remove(model)  # gone for this account: drop for good
                else:
                    slow = isinstance(exc, TimeoutError)
                    _model_paused[model] = time.monotonic() + (COOLDOWN_SLOW_S if slow else COOLDOWN_MODEL_S)
            log.warning("Smart Hint model %s failed (%s %s), trying next", model, type(exc).__name__, code)
            continue
        if text and text.strip():
            return text
        _model_paused[model] = time.monotonic() + COOLDOWN_MODEL_S  # empty answer: skip for now
    return None  # every model busy/slow: static hint now, the next request tries again


_executor = ThreadPoolExecutor(max_workers=8, thread_name_prefix="zmath-ai")


def _call_within(
    model: str, prompt: str, budget_ms: int, system: str = SYSTEM_PROMPT, max_tokens: int = MAX_OUTPUT_TOKENS
) -> str | None:
    """`_call` with a hard wall-clock limit (the SDK timeout is per network phase, not total).
    On timeout the call is abandoned; its thread ends when the SDK timeout fires."""
    future = _executor.submit(_call, model, prompt, system, max_tokens)
    try:
        return future.result(timeout=budget_ms / 1000)
    except FutureTimeout:
        future.cancel()
        raise TimeoutError(f"{model} exceeded {budget_ms} ms") from None


def _is_network_error(exc: Exception) -> bool:
    """Offline / DNS / refused connection: no model can work, so pause everything."""
    return "Connect" in type(exc).__name__ or (isinstance(exc, OSError) and not isinstance(exc, TimeoutError))


# Swapped out in tests. Receives only the request, never the answer.
generate: Callable[[AIHintRequest], str | None] = _gemini_generate


def smart_hint(req: AIHintRequest, guard: Guard) -> dict:
    """Return {'ai_text': str | None, 'source': 'ai' | 'static'}. Never raises."""
    static = {"ai_text": None, "source": "static"}
    if req.level not in LEVEL_RULES or req.step not in STEP_TASKS or not available():
        return static
    key = req.cache_key()
    with _lock:
        if key in _cache:
            _cache.move_to_end(key)
            return {"ai_text": _cache[key], "source": "ai"}
    try:
        raw = generate(req)
    except Exception as exc:  # noqa: BLE001 - quota, timeout, offline, SDK errors: all fall back
        note_failure(exc)
        return static
    text = clean(raw or "")
    if not text or not is_safe(text, guard, req.step):
        if text:
            log.info("Smart Hint dropped an unsafe text (step=%s, level=%s)", req.step, req.level)
        return static
    with _lock:
        _cache[key] = text
        while len(_cache) > CACHE_SIZE:
            _cache.popitem(last=False)
    return {"ai_text": text, "source": "ai"}


def note_failure(exc: Exception) -> None:
    """Pause every AI call after a failure that would hit the next request too."""
    code = _error_code(exc)
    if code == 429:
        _pause(COOLDOWN_QUOTA_S, "quota (429)")
    elif code in {400, 401, 403}:
        _pause(COOLDOWN_AUTH_S, f"key rejected ({code})")
    elif code is not None and 500 <= code < 600:
        pass  # busy/slow models are already skipped one by one; others may still work
    else:
        _pause(COOLDOWN_ERROR_S, type(exc).__name__)


def warm_up_in_background() -> None:
    """List models at startup without delaying it."""
    global _listing
    if not available():
        return
    with _lock:
        _listing = True
    threading.Thread(target=_safe_resolve, name="zmath-ai-warmup", daemon=True).start()


def _safe_resolve() -> None:
    try:
        resolve_models()
    except Exception as exc:  # noqa: BLE001 - startup must never fail because of AI
        log.warning("Smart Hint warm-up failed: %s", type(exc).__name__)


def reset_for_tests() -> None:
    global _client, _models, _models_listed, _list_retry_at, _paused_until, _listing
    with _lock:
        _cache.clear()
        _model_paused.clear()
        _thinking.clear()
        _client, _models, _models_listed, _list_retry_at, _paused_until = None, None, False, 0.0, 0.0
        _listing = False
