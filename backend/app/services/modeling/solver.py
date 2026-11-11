"""Step-by-step solver: evaluates a model and explains every operation."""

from __future__ import annotations

import ast
from collections.abc import Mapping
from fractions import Fraction

from app.services.modeling.expr import (
    apply_op,
    evaluate,
    fmt_int,
    fmt_operand,
    is_leaf,
    to_int,
)

_SYMBOL = {ast.Add: "+", ast.Sub: "−", ast.Mult: "×", ast.Div: ":"}


def explain_operation(op: type, a: int, b: int, thousands: bool = False) -> tuple[str, str]:
    """Return (rule code, student-friendly explanation) for `a op b`."""
    if op is ast.Add:
        if a == 0 or b == 0:
            return "add_zero", "Menambah 0 tidak mengubah bilangan."
        if (a > 0) == (b > 0):
            return "same_sign_add", "Tanda sama: jumlahkan nilainya, tandanya tetap sama."
        return (
            "diff_sign_add",
            "Tanda berbeda: kurangkan nilai yang lebih besar dengan yang lebih kecil, "
            "lalu ikuti tanda bilangan yang nilainya lebih besar.",
        )
    if op is ast.Sub:
        return (
            "subtract",
            f"Mengurangi {fmt_operand(b, thousands)} sama dengan menambah lawannya, "
            f"{fmt_operand(-b, thousands)}.",
        )
    rule = "multiply" if op is ast.Mult else "divide"
    return rule, "Tanda sama → hasil positif. Tanda berbeda → hasil negatif."


def trace(node: ast.AST, env: Mapping[str, int], thousands: bool = False) -> list[dict]:
    steps: list[dict] = []

    def walk(n: ast.AST) -> Fraction:
        if isinstance(n, ast.BinOp):
            a = walk(n.left)
            b = walk(n.right)
            result = apply_op(type(n.op), a, b)
            a_int, b_int, r_int = to_int(a), to_int(b), to_int(result)
            rule, explain = explain_operation(type(n.op), a_int, b_int, thousands)
            steps.append(
                {
                    "expr": f"{fmt_operand(a_int, thousands)} {_SYMBOL[type(n.op)]} "
                    f"{fmt_operand(b_int, thousands)}",
                    "result": r_int,
                    "result_text": fmt_int(r_int, thousands),
                    "rule": rule,
                    "explain": explain,
                }
            )
            return result
        return Fraction(evaluate(n, env))

    walk(node)
    return steps


def first_operation(node: ast.AST, env: Mapping[str, int]) -> tuple[type, int, int] | None:
    """The first operation a student would compute, using only given numbers."""
    if isinstance(node, ast.BinOp):
        for child in (node.left, node.right):
            found = first_operation(child, env)
            if found:
                return found
        if is_leaf(node.left) and is_leaf(node.right):
            return (
                type(node.op),
                to_int(evaluate(node.left, env)),
                to_int(evaluate(node.right, env)),
            )
    return None


def count_operations(node: ast.AST) -> int:
    return sum(isinstance(n, ast.BinOp) for n in ast.walk(node))
