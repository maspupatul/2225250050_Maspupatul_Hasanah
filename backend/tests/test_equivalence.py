import pytest

from app.content.loader import content
from app.services.misconceptions import FEEDBACK, diagnose_result
from app.services.modeling.equivalence import check_model
from app.services.modeling.expr import parse
from app.services.modeling.instantiate import Instance


def make(template_id: str, values: dict[str, int], answer: int) -> Instance:
    return Instance(content().templates[template_id], 0, values, answer)


DIVER = make("sea-chg-end", {"start": -4, "change": -3, "end": -7}, -7)
FREEZER = make("temp-chg-start", {"start": 3, "change": -4, "end": -1}, 3)
CITIES = make("temp-cmp", {"a": 4, "b": -6}, 10)
COLD_ROOM = make("temp-rpt", {"r": -3, "n": 4}, -12)


@pytest.mark.parametrize(
    "instance, model, expected",
    [
        (DIVER, "(-4) + (-3)", (True, None)),
        (DIVER, "(-3) + (-4)", (True, None)),
        (DIVER, "-4 - 3", (True, None)),
        (DIVER, "-7", (False, "missing_quantity")),
        (DIVER, "(-4) + (-3) + 1", (False, "extra_quantity")),
        (DIVER, "4 + 3", (False, "sign_or_order")),
        (FREEZER, "(-1) - (-4)", (True, None)),
        (FREEZER, "(-1) + 4", (True, None)),
        (FREEZER, "(-1) + (-4)", (False, "unknown_position")),
        (CITIES, "4 - (-6)", (True, None)),
        (CITIES, "(-6) - 4", (False, "sign_or_order")),
        (COLD_ROOM, "4 * (-3)", (True, None)),
        (COLD_ROOM, "(-3) + (-3) + (-3) + (-3)", (True, None)),
        (COLD_ROOM, "4 + (-3)", (False, "unknown_position")),
        (DIVER, "(-4) + ", (False, "invalid_expression")),
        (DIVER, "start + change", (False, "invalid_expression")),
    ],
)
def test_check_model(instance, model, expected):
    assert check_model(model, instance) == expected


@pytest.mark.parametrize(
    "model, values, answer, correct, code",
    [
        ("a + b", {"a": -5, "b": 3}, 2, -2, "sign_error"),
        ("a + b", {"a": -5, "b": 3}, -8, -2, "abs_sum"),
        ("a - b", {"a": 4, "b": -2}, 2, 6, "sub_negative"),
        ("a * b", {"a": -3, "b": -4}, -12, 12, "mult_sign"),
        ("a + b", {"a": -5, "b": 3}, 5, -2, "other"),
    ],
)
def test_diagnose_result(model, values, answer, correct, code):
    assert diagnose_result(parse(model), values, answer, correct) == code


def test_feedback_never_contains_digits():
    assert not any(ch.isdigit() for message in FEEDBACK.values() for ch in message)
