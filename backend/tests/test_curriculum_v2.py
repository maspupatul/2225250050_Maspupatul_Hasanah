"""Curriculum v2: real-life contexts, properties of operations, mixed operations."""

import pytest

from app.content.loader import content
from app.services.misconceptions import FEEDBACK, diagnose_result
from app.services.modeling.expr import parse
from app.services.modeling.hint_generator import HintView, make_hint
from app.services.modeling.instantiate import find_keywords, instantiate, render_text

PROPERTY_TEMPLATES = ["num-add3", "num-mul3", "num-dist", "num-div2", "num-mix-a", "num-mix-paren"]


def test_no_lift_or_basement_context_anywhere():
    c = content()
    assert "elevator" not in c.contexts
    texts = [t.text for t in c.templates.values()]
    texts += [str(lesson["segments"]) for lesson in c.lessons.values()]
    for text in texts:
        lowered = text.lower()
        assert "lift" not in lowered and "basement" not in lowered


def test_topics_are_in_the_required_order():
    c = content()
    titles = [m["title"] for m in c.modules]
    assert titles == [
        "Penjumlahan & Pengurangan",
        "Perkalian & Pembagian",
        "Sifat Operasi Perkalian & Pembagian",
        "Operasi Campuran & Soal Cerita",
    ]
    order = c.lesson_order()
    assert order.index("m3-t3") < order.index("m4-t1") < order.index("m5-t1") < order.index("m7-t1")


def test_real_life_story_contexts_are_practised():
    c = content()
    practised = {t for lesson in c.lessons.values() for t in lesson["practice"]["templates"]}
    contexts = {c.templates[t].context for t in practised if c.templates[t].kind == "story"}
    assert {"emoney", "score", "stairs", "temperature", "sea_depth"} <= contexts


@pytest.mark.parametrize("template_id", PROPERTY_TEMPLATES)
def test_property_hints_use_the_property_and_keep_a_blank(template_id):
    c = content()
    t = c.templates[template_id]
    for seed in range(40):
        inst = instantiate(t, seed)
        text = render_text(t, c.contexts[t.context], inst.values)
        view = HintView(t, c.contexts[t.context], inst.givens, text, find_keywords(text, c.glossary))
        level2 = make_hint(view, "result", 2)
        assert level2["visual"] is None  # several operations: no misleading single-jump picture
        level3 = make_hint(view, "result", 3)
        if t.schema_type in {"ADD3", "MUL3", "DIST"}:
            assert "□" in level3["template"]


def test_property_templates_are_built_for_the_property():
    c = content()
    for seed in range(60):
        v = instantiate(c.templates["num-add3"], seed).values
        assert (v["a"] + v["c"]) % 10 == 0  # an easy pair exists
        v = instantiate(c.templates["num-mul3"], seed).values
        assert abs(v["a"] * v["c"]) == 10
        v = instantiate(c.templates["num-dist"], seed).values
        assert abs(v["b"] + v["c"]) == 10


def test_new_misconceptions():
    # (-48) : 4 : (-2) = 6, but right-first gives (-48) : (-2) = 24
    values = {"a": -48, "b": 4, "c": -2}
    assert diagnose_result(parse("a / b / c"), values, 24, 6) == "div_grouping"
    # ((-2) + 7) * (-3) = -15, ignoring the brackets gives (-2) + 7 * (-3) = -23
    values = {"a": -2, "b": 7, "c": -3}
    assert diagnose_result(parse("(a + b) * c"), values, -23, -15) == "order_of_ops"
    for code in ("div_grouping", "order_of_ops"):
        assert not any(ch.isdigit() for ch in FEEDBACK[code])
