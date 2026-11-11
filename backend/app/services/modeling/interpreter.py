"""Interpret a result back into the story context (literacy step 4b)."""

from __future__ import annotations

import random

from app.services.modeling.expr import fmt_int
from app.services.modeling.schema import Context

_ALT_FMT = {"state": "change", "change": "state", "diff": "state"}


def interpret(context: Context, fmt: str, value: int) -> str | None:
    patterns = context.interpret.get(fmt)
    if not patterns:
        return None
    key = "pos" if value > 0 else "neg" if value < 0 else "zero"
    pattern = patterns.get(key)
    if pattern is None:
        return None
    return pattern.replace("{abs}", fmt_int(abs(value), context.thousands))


def interpret_options(
    context: Context, fmt: str, answer: int, rng: random.Random
) -> tuple[list[str], int]:
    """Correct interpretation plus up to two plausible distractors (opposite sign,
    state-vs-change confusion). Only called after the student found the answer."""
    correct = interpret(context, fmt, answer)
    if correct is None:
        raise ValueError(f"no interpretation pattern for fmt={fmt!r}")
    candidates: list[str] = []
    formats = [fmt]
    if context.interpret_alt and _ALT_FMT.get(fmt):
        formats.append(_ALT_FMT[fmt])
    for f in formats:
        for v in (answer, -answer):
            text = interpret(context, f, v)
            if text and text != correct and text not in candidates:
                candidates.append(text)
    options = [correct, *candidates[:2]]
    rng.shuffle(options)
    return options, options.index(correct)
