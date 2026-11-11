"""Safe parsing, evaluation and display of integer arithmetic expressions.

Never uses eval()/exec(): expressions are parsed with `ast` and only a small
whitelist of node types is accepted (see docs/KEAMANAN-PRIVASI.md).
"""

from __future__ import annotations

import ast
import operator
from collections.abc import Collection, Mapping
from fractions import Fraction

MAX_EXPR_LENGTH = 200


class ExprError(ValueError):
    """Raised when an expression is invalid or cannot be evaluated."""


_BIN_OPS = (ast.Add, ast.Sub, ast.Mult, ast.Div)
_CMP_FUNCS = {
    ast.Lt: operator.lt,
    ast.LtE: operator.le,
    ast.Gt: operator.gt,
    ast.GtE: operator.ge,
    ast.Eq: operator.eq,
    ast.NotEq: operator.ne,
}
_PREC = {ast.Add: 1, ast.Sub: 1, ast.Mult: 2, ast.Div: 2}
_SYMBOL = {ast.Add: "+", ast.Sub: "−", ast.Mult: "×", ast.Div: ":"}


def normalize(src: str) -> str:
    """Convert display symbols (−, ×, ÷, :) to Python operators."""
    return src.translate(str.maketrans({"−": "-", "×": "*", "÷": "/", ":": "/"})).strip()


def parse(src: str) -> ast.expr:
    src = normalize(src)
    if not src or len(src) > MAX_EXPR_LENGTH:
        raise ExprError("empty or too long")
    try:
        tree = ast.parse(src, mode="eval")
    except SyntaxError as exc:
        raise ExprError("invalid syntax") from exc
    _validate(tree.body)
    return tree.body


def _validate(node: ast.AST) -> None:
    if isinstance(node, ast.Constant):
        if type(node.value) is not int:
            raise ExprError("only integer literals are allowed")
    elif isinstance(node, ast.Name):
        return
    elif isinstance(node, ast.BinOp):
        if not isinstance(node.op, _BIN_OPS):
            raise ExprError("operator not allowed")
        _validate(node.left)
        _validate(node.right)
    elif isinstance(node, ast.UnaryOp):
        if not isinstance(node.op, (ast.USub, ast.UAdd, ast.Not)):
            raise ExprError("unary operator not allowed")
        _validate(node.operand)
    elif isinstance(node, ast.Compare):
        if not all(type(op) in _CMP_FUNCS for op in node.ops):
            raise ExprError("comparison not allowed")
        _validate(node.left)
        for comparator in node.comparators:
            _validate(comparator)
    elif isinstance(node, ast.BoolOp):
        for value in node.values:
            _validate(value)
    elif isinstance(node, ast.Call):
        func = node.func
        if not (isinstance(func, ast.Name) and func.id == "abs" and len(node.args) == 1):
            raise ExprError("function not allowed")
        if node.keywords:
            raise ExprError("keywords not allowed")
        _validate(node.args[0])
    else:
        raise ExprError(f"unsupported syntax: {type(node).__name__}")


def evaluate(expr: str | ast.expr, env: Mapping[str, int] | None = None) -> Fraction | bool:
    node = parse(expr) if isinstance(expr, str) else expr
    return _eval(node, env or {})


def _eval(node: ast.AST, env: Mapping[str, int]) -> Fraction | bool:
    if isinstance(node, ast.Constant):
        return Fraction(node.value)
    if isinstance(node, ast.Name):
        if node.id not in env:
            raise ExprError(f"unknown name: {node.id}")
        return Fraction(env[node.id])
    if isinstance(node, ast.BinOp):
        left = _eval(node.left, env)
        right = _eval(node.right, env)
        return apply_op(type(node.op), Fraction(left), Fraction(right))
    if isinstance(node, ast.UnaryOp):
        value = _eval(node.operand, env)
        if isinstance(node.op, ast.USub):
            return -value
        if isinstance(node.op, ast.UAdd):
            return value
        return not value
    if isinstance(node, ast.Compare):
        left = _eval(node.left, env)
        for op, comparator in zip(node.ops, node.comparators):
            right = _eval(comparator, env)
            if not _CMP_FUNCS[type(op)](left, right):
                return False
            left = right
        return True
    if isinstance(node, ast.BoolOp):
        values = [_eval(v, env) for v in node.values]
        return all(values) if isinstance(node.op, ast.And) else any(values)
    if isinstance(node, ast.Call):
        return abs(_eval(node.args[0], env))
    raise ExprError(f"unsupported syntax: {type(node).__name__}")


def apply_op(op: type, left: Fraction, right: Fraction) -> Fraction:
    if op is ast.Add:
        return left + right
    if op is ast.Sub:
        return left - right
    if op is ast.Mult:
        return left * right
    if right == 0:
        raise ExprError("division by zero")
    return left / right


def to_int(value: Fraction | bool | int) -> int:
    if isinstance(value, bool):
        raise ExprError("boolean is not a number")
    fraction = Fraction(value)
    if fraction.denominator != 1:
        raise ExprError("result is not an integer")
    return int(fraction)


def signed_literals(node: ast.AST) -> list[int]:
    """Integer literals in the expression, with a directly applied minus sign."""
    found: list[int] = []

    def walk(n: ast.AST) -> None:
        if (
            isinstance(n, ast.UnaryOp)
            and isinstance(n.op, ast.USub)
            and isinstance(n.operand, ast.Constant)
        ):
            found.append(-n.operand.value)
            return
        if isinstance(n, ast.Constant):
            found.append(n.value)
            return
        for child in ast.iter_child_nodes(n):
            walk(child)

    walk(node)
    return found


def has_names(node: ast.AST) -> bool:
    return any(isinstance(n, ast.Name) for n in ast.walk(node))


def names_in_order(node: ast.AST) -> list[str]:
    """Variable names in left-to-right reading order."""
    ordered: list[str] = []

    def walk(n: ast.AST) -> None:
        if isinstance(n, ast.Name):
            ordered.append(n.id)
        elif isinstance(n, ast.BinOp):
            walk(n.left)
            walk(n.right)
        else:
            for child in ast.iter_child_nodes(n):
                walk(child)

    walk(node)
    return ordered


def is_leaf(node: ast.AST) -> bool:
    if isinstance(node, (ast.Name, ast.Constant)):
        return True
    return (
        isinstance(node, ast.UnaryOp)
        and isinstance(node.op, ast.USub)
        and isinstance(node.operand, ast.Constant)
    )


# ---------------------------------------------------------------- display


def fmt_int(value: int, thousands: bool = False) -> str:
    magnitude = f"{abs(value):,}".replace(",", ".") if thousands else str(abs(value))
    return f"−{magnitude}" if value < 0 else magnitude


def fmt_operand(value: int, thousands: bool = False) -> str:
    text = fmt_int(value, thousands)
    return f"({text})" if value < 0 else text


def render(
    node: ast.AST,
    env: Mapping[str, int] | None = None,
    blanks: Collection[str] = (),
    thousands: bool = False,
) -> str:
    """Render an expression for students, e.g. `(−4) + 6`. Names in `blanks` become □."""
    env = env or {}

    def r(n: ast.AST) -> tuple[str, int]:
        if isinstance(n, ast.Name):
            if n.id in blanks:
                return "□", 4
            return fmt_operand(int(env[n.id]), thousands), 4
        if isinstance(n, ast.Constant):
            return fmt_operand(n.value, thousands), 4
        if isinstance(n, ast.UnaryOp) and isinstance(n.op, ast.USub):
            if isinstance(n.operand, ast.Constant):
                return fmt_operand(-n.operand.value, thousands), 4
            text, prec = r(n.operand)
            return "−" + (f"({text})" if prec < 3 else text), 3
        if isinstance(n, ast.UnaryOp) and isinstance(n.op, ast.UAdd):
            return r(n.operand)
        if isinstance(n, ast.BinOp):
            prec = _PREC[type(n.op)]
            left, left_prec = r(n.left)
            right, right_prec = r(n.right)
            if left_prec < prec:
                left = f"({left})"
            if right_prec < prec or (right_prec == prec and isinstance(n.op, (ast.Sub, ast.Div))):
                right = f"({right})"
            return f"{left} {_SYMBOL[type(n.op)]} {right}", prec
        raise ExprError(f"cannot render {type(n).__name__}")

    return r(node)[0]
