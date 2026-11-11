"""Soal Kembar: an isomorphic worked example (same schema, different numbers and,
where possible, a different context). Its answer always differs from the original."""

from __future__ import annotations

import random

from app.services.modeling import visual_script
from app.services.modeling.expr import fmt_int, fmt_operand, parse, render
from app.services.modeling.hint_generator import RELATION_MEANING
from app.services.modeling.instantiate import Instance, format_value, instantiate, render_text
from app.services.modeling.interpreter import interpret
from app.services.modeling.schema import Context, Template
from app.services.modeling.solver import trace

STEP_LABELS = {
    "known": "Pahami",
    "asked": "Ditanya",
    "model": "Buat Model",
    "result": "Hitung",
    "interpret": "Tafsirkan",
}


def pick_twin_template(original: Template, templates: dict[str, Template]) -> list[Template]:
    same_shape = [
        t
        for t in templates.values()
        if t.kind == original.kind
        and t.schema_type == original.schema_type
        and t.unknown == original.unknown
        and t.id != original.id
        # keep the Ujian Akhir bank fresh: practice problems never show exam stories
        and (t.pool == "practice" or original.pool == "exam")
    ]
    other_context = [t for t in same_shape if t.context != original.context]
    return other_context or same_shape or [original]


def make_twin(
    original: Instance,
    templates: dict[str, Template],
    contexts: dict[str, Context],
    rng: random.Random,
) -> dict:
    candidates = pick_twin_template(original.template, templates)
    for _ in range(100):
        template = rng.choice(candidates)
        twin = instantiate(template, rng.randrange(1 << 30))
        if twin.answer != original.answer and twin.values != original.values:
            break
    else:  # pragma: no cover - practically unreachable with the template ranges
        raise RuntimeError("could not build a twin example")
    return worked_example(twin, contexts[template.context])


def worked_example(instance: Instance, context: Context) -> dict:
    t = instance.template
    th = context.thousands
    values = instance.values
    node = parse(t.model)
    steps: list[dict] = []

    def add(key: str, content: str, why: str) -> None:
        steps.append({"key": key, "label": STEP_LABELS[key], "content": content, "why": why})

    if t.given:
        known = "; ".join(
            f"{format_value(context, t.fmt_of(n), values[n])} → {fmt_operand(values[n], th)}"
            for n in t.given
        )
        add("known", known, "Kata kunci di dekat bilangan menentukan tandanya.")
    if t.asked:
        add("asked", t.asked.options[t.asked.correct], "Lihat kalimat yang diakhiri tanda tanya.")
    model_text = render(node, values, thousands=th)
    if t.kind != "represent":
        why = RELATION_MEANING.get((t.schema_type, t.unknown)) or RELATION_MEANING.get(
            (t.schema_type, None), "Tulis operasi sesuai soal."
        )
        add("model", model_text, why)
    steps_trace = trace(node, values, th)
    calc = " → ".join(f"{s['expr']} = {s['result_text']}" for s in steps_trace) or fmt_int(
        instance.answer, th
    )
    explain = " ".join(dict.fromkeys(s["explain"] for s in steps_trace)) or (
        "Tanda menunjukkan arah: positif atau negatif."
    )
    add("result", calc, explain)
    meaning = interpret(context, t.answer_fmt, instance.answer) if t.kind == "story" else None
    if meaning:
        add("interpret", meaning, "Tanda hasil menunjukkan letak atau arah dalam cerita.")
    return {
        "text": render_text(t, context, values),
        "steps": steps,
        "visual": visual_script.review(t, context, values, instance.answer) | {"mode": "guided"},
    }
