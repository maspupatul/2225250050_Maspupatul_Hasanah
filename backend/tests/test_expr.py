from fractions import Fraction

import pytest

from app.services.modeling.expr import (
    ExprError,
    evaluate,
    parse,
    render,
    signed_literals,
    to_int,
)


def test_evaluate_basic_and_unicode_minus():
    assert evaluate("(−4) + 6") == 2
    assert evaluate("4 - (-2)") == 6
    assert evaluate("3 × (−4)") == -12
    assert evaluate("12 : (−4)") == -3


def test_division_returns_fraction_and_to_int_rejects_it():
    assert evaluate("7 / 2") == Fraction(7, 2)
    with pytest.raises(ExprError):
        to_int(evaluate("7 / 2"))
    with pytest.raises(ExprError):
        evaluate("1 / 0")


@pytest.mark.parametrize(
    "src",
    ["__import__('os')", "a.b", "[1, 2]", "2 ** 3", "1.5 + 2", "lambda: 1", "max(1, 2)", ""],
)
def test_rejects_unsafe_or_unsupported(src):
    with pytest.raises(ExprError):
        parse(src)


def test_names_and_constraints():
    env = {"a": -3, "b": 5}
    assert evaluate("a + b", env) == 2
    assert evaluate("a < 0 or b < 0", env) is True
    assert evaluate("abs(a) <= 3", env) is True


def test_signed_literals_and_render():
    node = parse("(-2) + (-3) + 1")
    assert signed_literals(node) == [-2, -3, 1]
    assert render(parse("a - b"), {"a": -4, "b": -10}) == "(−4) − (−10)"
    assert render(parse("a + b"), {"a": 2}, blanks={"b"}) == "2 + □"
    assert render(parse("q1 + q2"), {"q1": 5000, "q2": -3000}, thousands=True) == "5.000 + (−3.000)"
