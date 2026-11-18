"""MANDATORY (CLAUDE.md §5.7): Smart Hint (Gemini) must never reveal the answer and must
always fall back to the static hint. Gemini itself is replaced by fakes here."""

import dataclasses
import inspect

import pytest

from app.content.loader import content
from app.services import ai_hint, attempts
from app.services.ai_hint import AIHintRequest, Guard, clean, is_safe, number_words, rank_models

TEMPLATES = list(content().templates.values())


@pytest.fixture
def ai_on(monkeypatch):
    ai_hint.reset_for_tests()
    monkeypatch.setattr(ai_hint, "available", lambda: True)
    yield
    ai_hint.reset_for_tests()


def _request(**kw):
    base = {"problem_text": "Suhu −2 °C turun 3 °C. Berapa suhunya?", "step": "result", "level": 1,
            "static_hint": "Lihat tanda kedua bilangan."}
    return AIHintRequest(**(base | kw))


GUARD = Guard(forbidden=frozenset({5}), givens=frozenset({2, 3}))


# ------------------------------------------------------------------ structure


def test_request_has_no_answer_field():
    fields = {f.name for f in dataclasses.fields(AIHintRequest)}
    assert not {"answer", "forbidden", "result"} & fields
    assert ".answer" not in inspect.getsource(ai_hint)
    assert "answer" not in inspect.signature(ai_hint.build_prompt).parameters


def test_prompt_contains_only_request_data():
    prompt = ai_hint.build_prompt(_request(student_answer="1"))
    assert "Suhu −2 °C" in prompt and "Jawaban siswa yang masih keliru: 1" in prompt


# ------------------------------------------------------------------ guard


@pytest.mark.parametrize(
    "text",
    ["Hasilnya −5 °C.", "Jawabannya lima di bawah nol.", "Suhunya jadi minus Lima.", "Totalnya 5."],
)
def test_guard_rejects_answer_digits_and_words(text):
    assert not is_safe(text, GUARD, "result")


def test_guard_accepts_given_numbers_and_similar_words():
    assert is_safe("Mulai dari −2, lalu turun 3 langkah ke kiri. Berhenti di mana?", GUARD, "result")
    assert is_safe("Tulis satuannya.", Guard(frozenset({1}), frozenset({2, 3})), "result")


def test_guard_handles_thousands():
    guard = Guard(forbidden=frozenset({15000}), givens=frozenset({5000}))
    assert not is_safe("Uangnya Rp15.000.", guard, "result")
    assert not is_safe("lima belas ribu rupiah", guard, "result")
    assert is_safe("Uang sakunya Rp5.000.", guard, "result")


def test_guard_blocks_complete_model():
    assert not is_safe("Tulis (−2) + (−3).", GUARD, "model")
    assert is_safe("Tulis (−2) + □.", GUARD, "model")


def test_number_words():
    assert number_words(7) == "tujuh"
    assert number_words(11) == "sebelas"
    assert number_words(45) == "empat puluh lima"
    assert number_words(1250) == "seribu dua ratus lima puluh"


def test_clean_limits_and_strips():
    text = clean("**Ayo!** 🎉 Satu. Dua. Tiga. Empat.")
    assert text == "Ayo! Satu. Dua."  # 3 sentences max, emoji and markdown removed
    assert len(clean("kata " * 200)) <= ai_hint.MAX_CHARS + 1


def test_rank_models_prefers_hydrogen_then_chain():
    names = ["models/gemini-2.5-flash", "models/gemini-4-hydrogen", "models/gemini-3-flash-preview", "x"]
    assert rank_models(names) == ["gemini-4-hydrogen", "gemini-3-flash-preview", "gemini-2.5-flash"]
    assert rank_models(["publishers/google/models/gemini-2.5-flash"]) == ["gemini-2.5-flash"]


def test_rank_models_adds_fast_safety_net():
    names = ["gemini-4-hydrogen", "gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-image",
             "gemini-2.5-flash-lite", "gemini-omni-flash-preview", "gemini-3.7-flash"]
    assert rank_models(names) == ["gemini-4-hydrogen", "gemini-3.5-flash-lite", "gemini-2.5-flash-lite",
                                  "gemini-3.8-flash"]


class _FakeModels:
    """Stands in for client.models: each model name maps to an error or a text."""

    def __init__(self, behaviour):
        self.behaviour, self.calls = behaviour, []

    def generate_content(self, model, contents, config):
        self.calls.append((model, config.thinking_config.thinking_level if config.thinking_config else None))
        outcome = self.behaviour[model]
        if callable(outcome):
            outcome = outcome(config)
        if isinstance(outcome, Exception):
            raise outcome
        return type("R", (), {"text": outcome})()


def _chain(monkeypatch, behaviour):
    fake = _FakeModels(behaviour)
    monkeypatch.setattr(ai_hint, "_client", type("C", (), {"models": fake})())
    models = list(behaviour)
    monkeypatch.setattr(ai_hint, "_models_for_request", lambda: models)
    return fake, models


def test_chain_skips_busy_and_missing_models(ai_on, monkeypatch):
    fake, models = _chain(monkeypatch, {
        "gemini-4-hydrogen": _ApiError(503),
        "gemini-2.5-flash": _ApiError(404),
        "gemini-3.5-flash-lite": "Bayangkan termometer.",
    })
    assert ai_hint._gemini_generate(_request()) == "Bayangkan termometer."
    assert "gemini-2.5-flash" not in models  # 404: dropped for good
    fake.calls.clear()
    ai_hint._gemini_generate(_request())  # busy hydrogen is skipped for a while
    assert [m for m, _ in fake.calls] == ["gemini-3.5-flash-lite"]


def test_slow_model_is_cut_off_and_fallback_answers(ai_on, monkeypatch):
    import dataclasses as dc
    import time as t

    monkeypatch.setattr(ai_hint, "settings", dc.replace(ai_hint.settings, ai_timeout_ms=4000))
    slow = lambda c: t.sleep(3) or "terlambat"  # noqa: E731
    _chain(monkeypatch, {"gemini-4-hydrogen": slow, "gemini-3.5-flash-lite": "Cepat."})
    start = t.monotonic()
    assert ai_hint._gemini_generate(_request()) == "Cepat."
    assert t.monotonic() - start < 3  # hydrogen got ~1.8 s of the 4 s budget, not 3 s
    assert ai_hint._model_paused["gemini-4-hydrogen"] > t.monotonic()


def test_network_error_is_raised_at_once(ai_on, monkeypatch):
    class ConnectError(Exception):
        pass

    fake, _ = _chain(monkeypatch, {"gemini-4-hydrogen": ConnectError(), "gemini-3.5-flash-lite": "x"})
    with pytest.raises(ConnectError):
        ai_hint._gemini_generate(_request())
    assert len(fake.calls) == 1
    assert ai_hint.smart_hint(_request(), GUARD)["source"] == "static"
    assert ai_hint._paused_until > 0  # offline: everything pauses


def test_chain_raises_quota_at_once(ai_on, monkeypatch):
    fake, _ = _chain(monkeypatch, {"gemini-4-hydrogen": _ApiError(429), "gemini-3.5-flash-lite": "x"})
    with pytest.raises(_ApiError):
        ai_hint._gemini_generate(_request())
    assert [m for m, _ in fake.calls] == ["gemini-4-hydrogen"]


def test_chain_steps_up_thinking_level(ai_on, monkeypatch):
    err = _ApiError(400)
    err.args = ("Thinking level MINIMAL is not supported for this model.",)
    fake, _ = _chain(monkeypatch, {"gemini-4-hydrogen": lambda c: err if c.thinking_config and
                                   c.thinking_config.thinking_level == "MINIMAL" else "Pikirkan arahnya."})
    assert ai_hint._gemini_generate(_request()) == "Pikirkan arahnya."
    assert [lvl for _, lvl in fake.calls] == ["MINIMAL", "LOW"]
    fake.calls.clear()
    ai_hint._gemini_generate(_request())  # remembered: goes straight to LOW
    assert [lvl for _, lvl in fake.calls] == ["LOW"]


# ------------------------------------------------------------------ fallback & cache


def test_disabled_returns_static():
    ai_hint.reset_for_tests()
    assert ai_hint.smart_hint(_request(), GUARD) == {"ai_text": None, "source": "static"}


def test_safe_text_is_used_and_cached(ai_on, monkeypatch):
    calls = []
    monkeypatch.setattr(ai_hint, "generate", lambda req: calls.append(req) or "Bayangkan termometer. Ke mana kamu bergerak?")
    first = ai_hint.smart_hint(_request(), GUARD)
    second = ai_hint.smart_hint(_request(), GUARD)  # same class question: no second call
    assert first == second == {"ai_text": "Bayangkan termometer. Ke mana kamu bergerak?", "source": "ai"}
    assert len(calls) == 1
    ai_hint.smart_hint(_request(student_answer="1"), GUARD)  # different wrong answer -> new call
    assert len(calls) == 2


def test_unsafe_text_falls_back(ai_on, monkeypatch):
    monkeypatch.setattr(ai_hint, "generate", lambda req: "Jawabannya −5.")
    assert ai_hint.smart_hint(_request(), GUARD)["source"] == "static"


class _ApiError(Exception):
    def __init__(self, code):
        super().__init__(code)
        self.code = code


@pytest.mark.parametrize(
    ("exc", "pauses_all"),
    [(_ApiError(429), True), (TimeoutError(), True), (OSError("offline"), True), (_ApiError(503), False)],
)
def test_errors_fall_back(ai_on, monkeypatch, exc, pauses_all):
    def boom(req):
        raise exc

    monkeypatch.setattr(ai_hint, "generate", boom)
    assert ai_hint.smart_hint(_request(), GUARD) == {"ai_text": None, "source": "static"}
    # quota/offline pause everything; a busy model (5xx) is only skipped on its own
    assert (ai_hint._paused_until > 0) is pauses_all


def test_model_listing_never_blocks_a_request(ai_on, monkeypatch):
    started = []
    monkeypatch.setattr(ai_hint, "_safe_resolve", lambda: started.append(1))
    monkeypatch.setattr(ai_hint.threading, "Thread", lambda target, **kw: type("T", (), {"start": lambda s: target()})())
    assert ai_hint._models_for_request() is None  # nothing listed yet → static hint this time
    assert started == [1]  # listing was handed to a background thread
    assert ai_hint._gemini_generate(_request()) is None


# ------------------------------------------------------------------ end to end


@pytest.mark.parametrize("template", TEMPLATES, ids=lambda t: t.id)
def test_leaky_gemini_never_reaches_student(ai_on, monkeypatch, template):
    """A Gemini that 'cheats' by printing the answer (or an intermediate) is always filtered."""
    leak: dict[str, str] = {}
    monkeypatch.setattr(ai_hint, "generate", lambda req: leak["text"])
    steps = ["known", "asked", "model", "result"] if template.kind == "story" else ["result"]
    for seed in range(15):
        payload = attempts.start_attempt(lesson_id=None, template_id=template.id, guided=True, seed=seed)
        attempt = attempts.get_attempt(payload["attempt_id"])
        bad = sorted(attempts._forbidden_numbers(attempt))
        for step in steps:
            if step not in attempt.steps:
                continue
            attempt.current = attempt.steps.index(step)
            for n in bad:
                leak["text"] = f"Coba pikirkan. Hasilnya {n}."
                state = attempt.state(step)
                state.hint_level, state.tries_since_hint = 0, 1
                hint = attempts.request_hint(attempt.id, step)
                assert hint["source"] == "static" and hint["ai_text"] is None, (template.id, seed, step, n)
                assert hint["text"]  # static hint always present


def test_hint_response_has_source_field_when_ai_off():
    payload = attempts.start_attempt(lesson_id=None, template_id=TEMPLATES[0].id, guided=True, seed=1)
    step = payload["steps"][0]["key"]
    hint = attempts.request_hint(payload["attempt_id"], step)
    assert hint["source"] == "static" and hint["ai_text"] is None and hint["text"]
