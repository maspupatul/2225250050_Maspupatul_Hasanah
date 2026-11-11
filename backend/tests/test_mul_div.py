"""Perkalian & Pembagian (M4): models, visual paths and misconception feedback."""

import pytest

from app.content.loader import content
from app.services.misconceptions import FEEDBACK, diagnose_result
from app.services.modeling import visual_script
from app.services.modeling.equivalence import check_model
from app.services.modeling.expr import parse
from app.services.modeling.instantiate import instantiate

NEW = ["num-mul", "num-div", "money-prt", "temp-prt", "ex-num-mix", "ex-score",
       "ex-money-mixed", "ex-temp-rpt-start", "ex-sea-mlt-change"]


def end_of_path(script: dict) -> int:
    arrow = script["arrows"][-1]
    return arrow["at"] + arrow["value"]


@pytest.mark.parametrize("seed", range(60))
def test_multiplication_path_is_repeated_addition(seed):
    t = content().templates["num-mul"]
    inst = instantiate(t, seed)
    script = visual_script.review(t, content().contexts[t.context], inst.values, inst.answer)
    assert len(script["arrows"]) == abs(inst.values["a"])
    assert len({a["value"] for a in script["arrows"]}) == 1  # equal jumps
    assert end_of_path(script) == inst.answer


@pytest.mark.parametrize("template_id", ["num-div", "ex-num-div"])
def test_division_path_reaches_the_dividend(template_id):
    t = content().templates[template_id]
    for seed in range(60):
        inst = instantiate(t, seed)
        script = visual_script.review(t, content().contexts[t.context], inst.values, inst.answer)
        assert len(script["arrows"]) == abs(inst.answer)
        assert end_of_path(script) == inst.values["a"]


@pytest.mark.parametrize("template_id", ["money-prt", "temp-prt", "ex-money-debt", "ex-money-mixed"])
def test_sharing_path_has_n_equal_parts(template_id):
    t = content().templates[template_id]
    for seed in range(40):
        inst = instantiate(t, seed)
        script = visual_script.review(t, content().contexts[t.context], inst.values, inst.answer)
        assert len(script["arrows"]) == inst.values["n"]
        assert end_of_path(script) == inst.answer * inst.values["n"]


def test_hint_visual_never_draws_the_jump_count_for_division():
    t = content().templates["num-div"]
    for seed in range(60):
        inst = instantiate(t, seed)
        script = visual_script.hint(t, content().contexts[t.context], inst.givens)
        assert len(script["arrows"]) == 1 and script["arrows"][0]["value"] is None


@pytest.mark.parametrize("template_id", NEW)
def test_equivalent_models_are_accepted(template_id):
    t = content().templates[template_id]
    inst = instantiate(t, 3)
    v = inst.values
    forms = {
        "num-mul": lambda: [f"({v['a']}) * ({v['b']})", f"({v['b']}) * ({v['a']})"],
        "num-div": lambda: [f"({v['a']}) : ({v['b']})"],
        "money-prt": lambda: [f"({v['total']}) / {v['n']}"],
        "temp-prt": lambda: [f"({v['total']}) : {v['n']}"],
        "ex-num-mix": lambda: [f"({v['c']}) / ({v['d']}) + ({v['a']}) * ({v['b']})"],
        "ex-score": lambda: [f"{v['p']} * {v['b']} + ({v['m']}) * {v['s']}"],
        "ex-money-mixed": lambda: [f"(({v['q1']}) + ({v['q2']})) / {v['n']}"],
        "ex-temp-rpt-start": lambda: [f"{v['start']} + {v['n']} * ({v['r']})"],
        "ex-sea-mlt-change": lambda: [f"({v['end']}) - (({v['start']}) + ({v['c1']}))"],
    }[template_id]()
    for form in forms:
        assert check_model(form, inst) == (True, None), form


def test_bare_answer_is_not_a_model():
    t = content().templates["ex-money-mixed"]
    inst = instantiate(t, 1)
    assert check_model(str(inst.answer), inst)[0] is False


def test_misconceptions_for_multiplication_and_division():
    assert diagnose_result(parse("a * b"), {"a": -3, "b": 4}, 12, -12) == "mult_sign"
    assert diagnose_result(parse("a * b"), {"a": -3, "b": 4}, 1, -12) == "mult_as_add"
    assert diagnose_result(parse("a / b"), {"a": -12, "b": 4}, -48, -3) == "div_as_mult"
    # (-4) * 3 + (-18) / (-3) = -6, but left to right: ((-12) + (-18)) / (-3) = 10
    values = {"a": -4, "b": 3, "c": -18, "d": -3}
    assert diagnose_result(parse("a * b + c / d"), values, 10, -6) == "order_of_ops"
    for code in ("mult_as_add", "div_as_mult", "order_of_ops"):
        assert not any(ch.isdigit() for ch in FEEDBACK[code])
