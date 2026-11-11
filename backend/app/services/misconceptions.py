"""Misconception detection and feedback messages.

Feedback explains WHERE the thinking went wrong but never states the correct answer
(docs/DESAIN-PEDAGOGIS.md §6). None of these messages may contain digits.
"""

from __future__ import annotations

import ast

from fractions import Fraction

from app.services.modeling.expr import ExprError, apply_op, evaluate, is_leaf, to_int

FEEDBACK: dict[str, str] = {
    "sign_error": "Hampir! Besar angkanya sudah dekat, tapi periksa lagi tandanya: positif atau negatif?",
    "abs_sum": "Tanda kedua bilangan berbeda, jadi arahnya berlawanan. "
    "Apakah nilainya dijumlahkan atau dikurangkan?",
    "sub_negative": "Ingat: mengurangi bilangan negatif sama dengan menambah lawannya.",
    "mult_sign": "Periksa aturan tanda: tanda sama hasilnya positif, tanda berbeda hasilnya negatif.",
    "keyword_sign": "Tanda salah satu bilangan belum tepat. "
    "Perhatikan kata di dekatnya: naik atau turun? Di atas atau di bawah?",
    "missing_quantity": "Masih ada bilangan dari soal yang belum kamu pakai.",
    "extra_quantity": "Ada bilangan yang tidak ada di soal. Coba periksa lagi.",
    "unknown_position": "Perhatikan apa yang ditanyakan. "
    "Yang dicari keadaan awal, perubahan, atau keadaan akhir?",
    "sign_or_order": "Hasil modelmu berlawanan tanda. Periksa urutan bilangan atau tandanya.",
    "operation_choice": "Operasi hitungnya belum tepat. "
    "Pikirkan lagi: digabung, dikurangi, berulang, atau dibagi rata?",
    "mult_as_add": "Ini perkalian, bukan penjumlahan. Perkalian adalah penjumlahan berulang.",
    "div_as_mult": "Ini pembagian, bukan perkalian. "
    "Cari bilangan yang jika dikali pembagi menghasilkan bilangan yang dibagi.",
    "order_of_ops": "Ingat urutan operasi: kali dan bagi dikerjakan lebih dulu, "
    "baru tambah dan kurang.",
    "invalid_expression": "Kalimat matematikanya belum lengkap. "
    "Periksa lagi angka, tanda operasi, dan kurungnya.",
    "asked_wrong": "Belum tepat. Baca lagi kalimat tanyanya pelan-pelan.",
    "interpret_error": "Perhatikan tanda hasilmu: positif atau negatif? Apa artinya di cerita ini?",
    "other": "Belum tepat. Coba periksa lagi langkahmu, atau buka petunjuk.",
}

DEFERRED_MESSAGE = (
    "Tidak apa-apa, soal ini kita simpan dulu. "
    "Nanti kamu akan mencobanya lagi dengan angka yang berbeda. 💪"
)


def diagnose_result(node: ast.AST, values: dict[str, int], answer: int, correct: int) -> str:
    """Guess why a numeric result is wrong."""
    if isinstance(node, ast.BinOp) and is_leaf(node.left) and is_leaf(node.right):
        a = to_int(evaluate(node.left, values))
        b = to_int(evaluate(node.right, values))
        if isinstance(node.op, (ast.Mult, ast.Div)) and answer == -correct:
            return "mult_sign"
        if isinstance(node.op, ast.Mult) and answer == a + b:
            return "mult_as_add"
        if isinstance(node.op, ast.Div) and answer == a * b:
            return "div_as_mult"
        if isinstance(node.op, ast.Add) and (a < 0) != (b < 0) and abs(answer) == abs(a) + abs(b):
            return "abs_sum"
        if isinstance(node.op, ast.Sub) and b < 0 and answer == a + b:
            return "sub_negative"
    if answer == -correct:
        return "sign_error"
    if _mixes_precedence(node) and answer == _left_to_right(node, values):
        return "order_of_ops"
    return "other"


def _flatten(node: ast.AST) -> list:
    """Operands and operator types in reading order, ignoring precedence."""
    if isinstance(node, ast.BinOp):
        return [*_flatten(node.left), type(node.op), *_flatten(node.right)]
    return [node]


def _mixes_precedence(node: ast.AST) -> bool:
    ops = {type(n.op) for n in ast.walk(node) if isinstance(n, ast.BinOp)}
    return bool(ops & {ast.Add, ast.Sub}) and bool(ops & {ast.Mult, ast.Div})


def _left_to_right(node: ast.AST, values: dict[str, int]) -> int | None:
    """The value a student gets when computing strictly from left to right."""
    items = _flatten(node)
    try:
        total = Fraction(evaluate(items[0], values))
        for op, operand in zip(items[1::2], items[2::2]):
            total = apply_op(op, total, Fraction(evaluate(operand, values)))
        return to_int(total)
    except ExprError:
        return None
