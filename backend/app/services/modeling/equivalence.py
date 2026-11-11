"""Check a student's model against the key model (docs/PEMODELAN-SOAL-CERITA.md §4.2)."""

from __future__ import annotations

from collections import Counter

from app.services.modeling.expr import ExprError, evaluate, has_names, parse, signed_literals, to_int
from app.services.modeling.instantiate import Instance


def check_model(student_src: str, instance: Instance) -> tuple[bool, str | None]:
    """Return (accepted, misconception_code).

    Accepted when the value is right AND the model uses exactly the quantities of the
    problem (so writing the bare answer is not accepted). Equivalent forms such as
    `a - b` and `a + (-b)` or a different order are accepted.
    """
    try:
        node = parse(student_src)
        if has_names(node):
            return False, "invalid_expression"
        value = to_int(evaluate(node))
    except ExprError:
        return False, "invalid_expression"

    template = instance.template
    literals = Counter(abs(v) for v in signed_literals(node))
    expected = Counter(abs(instance.values[g]) for g in template.given)
    value_ok = value == instance.answer

    if value_ok and literals == expected:
        return True, None

    if value_ok and template.schema_type == "RPT" and {"n", "r"} <= instance.values.keys():
        n, r = instance.values["n"], abs(instance.values["r"])
        if set(literals) == {r} and literals[r] == n:  # repeated addition: r + r + ... (n times)
            return True, None

    if literals != expected:
        if expected - literals:
            return False, "missing_quantity"
        return False, "extra_quantity"

    if template.forward_model:
        try:
            if value == to_int(evaluate(template.forward_model, instance.values)):
                return False, "unknown_position"
        except ExprError:
            pass
    if value == -instance.answer:
        return False, "sign_or_order"
    return False, "operation_choice"
