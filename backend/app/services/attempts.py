"""Practice attempts: the step-by-step state machine (docs/DESAIN-PEDAGOGIS.md §6.3).

Stage 1 keeps attempts in memory (no Supabase yet). Restarting the server clears
open attempts; student progress itself is stored on the device by the frontend.
"""

from __future__ import annotations

import random
import secrets
from collections import OrderedDict
from dataclasses import dataclass, field
from typing import Any

from app.content.loader import content
from app.core.errors import AppError
from app.services.misconceptions import DEFERRED_MESSAGE, FEEDBACK, diagnose_result
from app.services.modeling import visual_script
from app.services.modeling.equivalence import check_model
from app.services.modeling.expr import fmt_int, parse, render
from app.services.modeling.hint_generator import HintView, make_hint
from app.services.modeling.instantiate import Instance, find_keywords, instantiate, render_text
from app.services.modeling.interpreter import interpret, interpret_options
from app.services.modeling.solver import trace
from app.services.modeling.twin import STEP_LABELS, make_twin

STORY_GUIDED = ["known", "asked", "model", "result", "interpret"]
STORY_FREE = ["result", "interpret"]
SIMPLE = ["result"]
MAX_HINT_LEVEL = 3
WRONG_AFTER_LAST_HINT_FOR_TWIN = 2
HINT_WEIGHTS = {0: 1.0, 1: 0.8, 2: 0.6, 3: 0.4}
TWIN_WEIGHT = 0.2
MAX_STORED_ATTEMPTS = 5000

PROMPTS = {
    "known": "Bilangan apa saja yang diketahui? Pilih beserta tandanya.",
    "asked": "Apa yang ditanyakan soal ini?",
    "model": "Susun kalimat matematikanya.",
    "interpret": "Apa arti hasilmu dalam cerita? Pilih yang paling masuk akal.",
}
RESULT_PROMPTS = {
    "represent": "Tuliskan sebagai bilangan bulat.",
    "numeric": "Berapa hasilnya?",
    "story": "Hitung hasil kalimat matematikamu.",
}
PRAISE = {
    0: "Tepat! Kamu menemukannya sendiri. 🎉",
    1: "Benar! Petunjuknya kamu pakai dengan baik.",
    2: "Benar! Kamu berhasil menemukannya.",
    3: "Benar! Kamu terus berusaha sampai berhasil. 💪",
}


@dataclass
class StepState:
    hint_level: int = 0
    tries_since_hint: int = 0
    wrong_after_last_hint: int = 0


@dataclass
class Attempt:
    id: str
    instance: Instance
    text: str
    question: str | None
    keywords: list[dict]
    steps: list[str]
    guided: bool
    known_options: list[int] = field(default_factory=list)
    asked_options: list[str] = field(default_factory=list)
    asked_correct: int = 0
    interpret_options: list[str] | None = None
    interpret_correct: int | None = None
    current: int = 0
    states: dict[str, StepState] = field(default_factory=dict)
    status: str = "open"
    twin_available: bool = False
    twin_shown: bool = False
    hints_requested: int = 0

    @property
    def current_step(self) -> str:
        return self.steps[min(self.current, len(self.steps) - 1)]

    @property
    def max_hint_level(self) -> int:
        return max((s.hint_level for s in self.states.values()), default=0)

    def state(self, step: str) -> StepState:
        return self.states.setdefault(step, StepState())


_STORE: OrderedDict[str, Attempt] = OrderedDict()


def _save(attempt: Attempt) -> None:
    _STORE[attempt.id] = attempt
    _STORE.move_to_end(attempt.id)
    while len(_STORE) > MAX_STORED_ATTEMPTS:
        _STORE.popitem(last=False)


def get_attempt(attempt_id: str) -> Attempt:
    attempt = _STORE.get(attempt_id)
    if attempt is None:
        raise AppError("ATTEMPT_NOT_FOUND", "Soal tidak ditemukan. Yuk, mulai soal baru.", 404)
    return attempt


def _open_attempt(attempt_id: str, step: str | None = None) -> Attempt:
    attempt = get_attempt(attempt_id)
    if attempt.status != "open":
        raise AppError("ATTEMPT_CLOSED", "Soal ini sudah selesai.", 409)
    if step is not None and step != attempt.current_step:
        raise AppError("VALIDATION_ERROR", "Selesaikan langkah yang sedang aktif dulu ya.", 400)
    return attempt


# ------------------------------------------------------------------ start


def start_attempt(
    *, lesson_id: str | None, template_id: str | None, guided: bool, seed: int | None = None
) -> dict:
    c = content()
    if template_id:
        template = c.templates.get(template_id)
        if template is None:
            raise AppError("NOT_FOUND", "Soal tidak ditemukan.", 404)
    elif lesson_id:
        lesson = c.lessons.get(lesson_id)
        if lesson is None:
            raise AppError("NOT_FOUND", "Pelajaran tidak ditemukan.", 404)
        template = c.templates[secrets.choice(lesson["practice"]["templates"])]
    else:
        raise AppError("VALIDATION_ERROR", "Pilih pelajaran atau soal terlebih dahulu.", 400)

    seed = secrets.randbits(31) if seed is None else seed
    instance = instantiate(template, seed)
    context = c.contexts[template.context]
    text = render_text(template, context, instance.values)
    question = render_text(template, context, instance.values, template.question) if template.question else None
    rng = random.Random(seed ^ 0x5F3759DF)

    if template.kind == "story":
        steps = STORY_GUIDED if guided else STORY_FREE
    else:
        steps = SIMPLE

    known_options: list[int] = []
    for name in template.given:
        value = instance.values[name]
        known_options += [value] if template.fmt_of(name) == "count" else [value, -value]
    known_options = list(dict.fromkeys(known_options))
    rng.shuffle(known_options)

    asked_options: list[str] = []
    asked_correct = 0
    if template.asked:
        asked_options = list(template.asked.options)
        correct_text = asked_options[template.asked.correct]
        rng.shuffle(asked_options)
        asked_correct = asked_options.index(correct_text)

    attempt = Attempt(
        id=secrets.token_urlsafe(12),
        instance=instance,
        text=text,
        question=question,
        keywords=find_keywords(text, c.glossary),
        steps=list(steps),
        guided=guided and template.kind == "story",
        known_options=known_options,
        asked_options=asked_options,
        asked_correct=asked_correct,
    )
    _save(attempt)
    return _problem_payload(attempt)


def _problem_payload(attempt: Attempt) -> dict:
    template = attempt.instance.template
    context = content().contexts[template.context]
    return {
        "attempt_id": attempt.id,
        "template_id": template.id,
        "kind": template.kind,
        "schema_type": template.schema_type,
        "context": template.context,
        "level": template.level,
        "text": attempt.text,
        "question": attempt.question,
        "keywords": attempt.keywords,
        "guided": attempt.guided,
        "steps": [_step_definition(attempt, s) for s in attempt.steps],
        "current_step": attempt.current_step,
        "visual": visual_script.explore(template, context, attempt.instance.givens),
        "hints_per_step": MAX_HINT_LEVEL,
        "unit": context.unit,
        "thousands": context.thousands,
        "literacy": template.literacy,
    }


def _step_definition(attempt: Attempt, step: str) -> dict:
    template = attempt.instance.template
    context = content().contexts[template.context]
    base = {"key": step, "label": STEP_LABELS[step]}
    if step == "known":
        return base | {"prompt": PROMPTS[step], "input": "number_chips", "options": attempt.known_options}
    if step == "asked":
        return base | {"prompt": PROMPTS[step], "input": "choice", "options": attempt.asked_options}
    if step == "model":
        chips = sorted(attempt.instance.givens.values())
        return base | {
            "prompt": PROMPTS[step],
            "input": "expression_builder",
            "chips": chips,
            "operators": ["+", "-", "*", "/", "(", ")"],
        }
    if step == "result":
        return base | {"prompt": RESULT_PROMPTS[template.kind], "input": "integer", "unit": context.unit}
    # interpret: options are sent only after the result step is correct
    return base | {"prompt": PROMPTS["interpret"], "input": "choice", "options": None}


# ------------------------------------------------------------------ answer


def _parse_int(answer: Any) -> int:
    if isinstance(answer, bool):
        raise AppError("VALIDATION_ERROR", "Jawaban harus berupa bilangan bulat.", 400)
    if isinstance(answer, int):
        return answer
    if isinstance(answer, str):
        cleaned = answer.replace("−", "-").replace(".", "").replace(" ", "")
        try:
            return int(cleaned)
        except ValueError:
            pass
    raise AppError("VALIDATION_ERROR", "Jawaban harus berupa bilangan bulat.", 400)


def _check(attempt: Attempt, step: str, answer: Any) -> tuple[bool, str | None]:
    instance = attempt.instance
    template = instance.template
    if step == "known":
        if not isinstance(answer, list):
            raise AppError("VALIDATION_ERROR", "Pilih bilangan yang diketahui.", 400)
        chosen = sorted({_parse_int(a) for a in answer})
        expected = sorted(instance.givens.values())
        if chosen == expected:
            return True, None
        if sorted(abs(v) for v in chosen) == sorted(abs(v) for v in expected):
            return False, "keyword_sign"
        return False, "missing_quantity" if len(chosen) < len(expected) else "extra_quantity"
    if step == "asked":
        return (_parse_int(answer) == attempt.asked_correct), "asked_wrong"
    if step == "model":
        if not isinstance(answer, str):
            raise AppError("VALIDATION_ERROR", "Kalimat matematika harus berupa teks.", 400)
        return check_model(answer, instance)
    if step == "result":
        value = _parse_int(answer)
        if value == instance.answer:
            return True, None
        if template.kind == "represent":
            return False, "keyword_sign" if value == -instance.answer else "other"
        return False, diagnose_result(parse(template.model), instance.values, value, instance.answer)
    # interpret
    return (_parse_int(answer) == attempt.interpret_correct), "interpret_error"


def submit_step(attempt_id: str, step: str, answer: Any) -> dict:
    attempt = _open_attempt(attempt_id, step)
    ok, code = _check(attempt, step, answer)
    state = attempt.state(step)

    if ok:
        attempt.current += 1
        response: dict[str, Any] = {
            "correct": True,
            "step": step,
            "feedback": PRAISE[state.hint_level],
            "attempt_status": "open",
        }
        if attempt.current >= len(attempt.steps):
            attempt.status = "correct"
            response |= {
                "attempt_status": "correct",
                "feedback": "Hebat! Soal ini selesai. 🎉",
                "mastery_weight": TWIN_WEIGHT if attempt.twin_shown else HINT_WEIGHTS[attempt.max_hint_level],
                "max_hint_level": attempt.max_hint_level,
                "twin_shown": attempt.twin_shown,
                "review": _review(attempt),
            }
        else:
            response["next_step"] = attempt.current_step
            if attempt.current_step == "interpret":
                _prepare_interpret(attempt)
                response["interpret_options"] = attempt.interpret_options
        return response

    state.tries_since_hint += 1
    if attempt.twin_shown:
        attempt.status = "deferred"
        return {
            "correct": False,
            "step": step,
            "misconception": code,
            "attempt_status": "deferred",
            "feedback": DEFERRED_MESSAGE,
        }
    if state.hint_level == MAX_HINT_LEVEL:
        state.wrong_after_last_hint += 1
        if state.wrong_after_last_hint >= WRONG_AFTER_LAST_HINT_FOR_TWIN:
            attempt.twin_available = True
    return {
        "correct": False,
        "step": step,
        "misconception": code,
        "feedback": FEEDBACK.get(code or "other", FEEDBACK["other"]),
        "attempt_status": "open",
        "next_hint_level": state.hint_level + 1 if state.hint_level < MAX_HINT_LEVEL else None,
        "hint_available": state.hint_level < MAX_HINT_LEVEL,
        "twin_available": attempt.twin_available,
    }


def _prepare_interpret(attempt: Attempt) -> None:
    template = attempt.instance.template
    context = content().contexts[template.context]
    rng = random.Random(attempt.instance.seed ^ 0x2545F491)
    options, correct = interpret_options(context, template.answer_fmt, attempt.instance.answer, rng)
    attempt.interpret_options, attempt.interpret_correct = options, correct


def _review(attempt: Attempt) -> dict:
    instance = attempt.instance
    template = instance.template
    context = content().contexts[template.context]
    node = parse(template.model)
    th = context.thousands
    sign_word = "negatif" if instance.answer < 0 else "positif"
    return {
        "model": render(node, instance.values, thousands=th) if template.kind != "represent" else None,
        "trace": trace(node, instance.values, th),
        "answer": instance.answer,
        "answer_text": fmt_int(instance.answer, th),
        "unit": context.unit,
        "interpretation": interpret(context, template.answer_fmt, instance.answer)
        if template.kind == "story"
        else None,
        "visual": visual_script.review(template, context, instance.values, instance.answer),
        "reflection": f"Mengapa hasilnya {sign_word}? Jelaskan dengan kata-katamu sendiri.",
    }


# ------------------------------------------------------------------ hints & twin


def request_hint(attempt_id: str, step: str) -> dict:
    attempt = _open_attempt(attempt_id, step)
    state = attempt.state(step)
    if state.hint_level >= MAX_HINT_LEVEL:
        raise AppError("NO_MORE_HINTS", "Semua petunjuk untuk langkah ini sudah dibuka.", 409)
    if state.hint_level >= 1 and state.tries_since_hint == 0:
        raise AppError("HINT_LOCKED", "Coba jawab dulu ya, lalu buka petunjuk berikutnya.", 409)
    state.hint_level += 1
    state.tries_since_hint = 0
    state.wrong_after_last_hint = 0
    attempt.hints_requested += 1

    template = attempt.instance.template
    view = HintView(
        template=template,
        context=content().contexts[template.context],
        givens=attempt.instance.givens,  # never the answer
        text=attempt.text,
        keywords=attempt.keywords,
    )
    hint = make_hint(view, step, state.hint_level)
    hint["hints_remaining"] = MAX_HINT_LEVEL - state.hint_level
    return hint


def request_twin(attempt_id: str) -> dict:
    attempt = _open_attempt(attempt_id)
    if not attempt.twin_available:
        raise AppError("TWIN_NOT_AVAILABLE", "Soal kembar belum tersedia. Coba petunjuknya dulu ya.", 409)
    attempt.twin_available = False
    attempt.twin_shown = True
    c = content()
    rng = random.Random(attempt.instance.seed ^ 0x9E3779B9)
    return {
        "twin": make_twin(attempt.instance, c.templates, c.contexts, rng),
        "message": "Pelajari contoh ini, lalu coba lagi soalmu dengan cara yang sama.",
    }
