"""MANDATORY (CLAUDE.md §5.7): hints must never reveal the final answer."""

import inspect
import re

import pytest

from app.content.loader import content
from app.services.attempts import STORY_GUIDED, start_attempt
from app.services.modeling import hint_generator
from app.services.modeling.hint_generator import HintView, make_hint
from app.services.modeling.instantiate import find_keywords, instantiate, render_text

SEEDS = range(120)
TEMPLATES = list(content().templates.values())


def numbers_in(text: str) -> set[int]:
    text = re.sub(r"(?<=\d)\.(?=\d{3})", "", text or "")  # 5.000 -> 5000
    return {int(n) for n in re.findall(r"\d+", text)}


def visual_values(script: dict | None) -> set[int]:
    if not script:
        return set()
    values = {m["value"] for m in script.get("marks", [])}
    for arrow in script.get("arrows", []):
        values.add(arrow["at"])
        if arrow["value"] is not None:
            values.add(arrow["at"] + arrow["value"])
        values |= numbers_in(arrow.get("label", ""))
    if script.get("pointer") is not None:
        values.add(script["pointer"])
    return values


def test_hint_view_has_no_answer_field():
    assert "answer" not in inspect.signature(HintView).parameters
    assert "answer" not in inspect.signature(make_hint).parameters
    source = inspect.getsource(hint_generator)
    assert ".answer" not in source


@pytest.mark.parametrize("template", TEMPLATES, ids=lambda t: t.id)
def test_no_hint_reveals_answer(template):
    c = content()
    context = c.contexts[template.context]
    steps = STORY_GUIDED if template.kind == "story" else ["result"]
    for seed in SEEDS:
        inst = instantiate(template, seed)
        text = render_text(template, context, inst.values)
        view = HintView(template, context, inst.givens, text, find_keywords(text, c.glossary))
        for step in steps:
            if step == "interpret":
                continue  # asked only after the student already found the answer
            for level in (1, 2, 3):
                hint = make_hint(view, step, level)
                shown = numbers_in(hint["text"]) | numbers_in(hint.get("template") or "")
                assert abs(inst.answer) not in shown, (template.id, seed, step, level, hint)
                script = hint.get("visual")
                if script:
                    assert script["showEnd"] is False
                    assert inst.answer not in visual_values(script), (template.id, seed, step, hint)
                if step == "model" and level == 3:
                    assert "□" in hint["template"]


@pytest.mark.parametrize("template", TEMPLATES, ids=lambda t: t.id)
def test_problem_payload_has_no_answer(template):
    for seed in range(30):
        payload = start_attempt(lesson_id=None, template_id=template.id, guided=True, seed=seed)
        inst = instantiate(template, seed)
        assert "answer" not in payload and "review" not in payload
        assert inst.answer not in visual_values(payload["visual"])
        for step in payload["steps"]:
            if step["key"] == "interpret":
                assert step["options"] is None
