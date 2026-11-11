"""Turn a template + seed into a concrete problem instance, and render its text."""

from __future__ import annotations

import random
import re
from dataclasses import dataclass

from app.services.modeling.expr import ExprError, evaluate, fmt_int, parse, render, to_int
from app.services.modeling.schema import Context, GlossaryTerm, Template

MAX_TRIES = 2000


class GenerationError(RuntimeError):
    pass


@dataclass(frozen=True)
class Instance:
    template: Template
    seed: int
    values: dict[str, int]
    answer: int

    @property
    def givens(self) -> dict[str, int]:
        """Only the quantities that appear in the problem text (never the answer)."""
        return {name: self.values[name] for name in self.template.given}


def instantiate(template: Template, seed: int) -> Instance:
    """Deterministic: the same template and seed always give the same instance.

    Global rules (on top of the template constraints):
    - the answer is a non-zero integer;
    - the given quantities have different absolute values;
    - |answer| differs from every |given|, so a hint that mentions a given number
      can never accidentally show the answer.
    """
    rng = random.Random(seed)
    for _ in range(MAX_TRIES):
        values: dict[str, int] = {}
        valid = True
        for name, spec in template.vars.items():
            value = rng.randint(*spec.range)
            if spec.nonzero and value == 0:
                valid = False
                break
            values[name] = value * spec.step
        if not valid:
            continue
        try:
            for name, expr in template.derived.items():
                values[name] = to_int(evaluate(expr, values))
            if not all(evaluate(c, values) for c in template.constraints):
                continue
            answer = to_int(evaluate(template.model, values))
        except ExprError:
            continue
        given_abs = [abs(values[g]) for g in template.given]
        if answer == 0 or len(set(given_abs)) != len(given_abs) or abs(answer) in given_abs:
            continue
        return Instance(template=template, seed=seed, values=values, answer=answer)
    raise GenerationError(f"cannot generate a valid instance for {template.id}")


# ------------------------------------------------------------------ rendering


def format_value(context: Context, fmt: str, value: int) -> str:
    """Format a quantity in context, e.g. -4 with 'state' in sea_depth context."""
    magnitude = fmt_int(abs(value), context.thousands)
    if fmt == "count":
        return magnitude
    patterns = context.fmt.get(fmt)
    if patterns is None:
        return fmt_int(value, context.thousands)
    key = "pos" if value > 0 else "neg" if value < 0 else "zero"
    pattern = patterns.get(key) or patterns.get("pos") or "{abs}"
    return pattern.replace("{abs}", magnitude)


def render_text(
    template: Template, context: Context, values: dict[str, int], source: str | None = None
) -> str:
    """Fill `{name}` placeholders of the template text (or of `source`)."""

    def replace(match: re.Match[str]) -> str:
        name = match.group(1)
        if name == "model":
            return render(parse(template.model), values, thousands=context.thousands)
        return format_value(context, template.fmt_of(name), values[name])

    return re.sub(r"\{(\w+)\}", replace, template.text if source is None else source)


def find_keywords(text: str, glossary: list[GlossaryTerm]) -> list[dict]:
    """Locate glossary phrases in the text (longest first, no overlaps)."""
    lowered = text.lower()
    taken: list[tuple[int, int]] = []
    found: list[dict] = []
    for term in sorted(glossary, key=lambda t: len(t.phrase), reverse=True):
        pattern = re.compile(rf"(?<!\w){re.escape(term.phrase.lower())}(?!\w)")
        for match in pattern.finditer(lowered):
            start, end = match.span()
            if any(start < t_end and end > t_start for t_start, t_end in taken):
                continue
            taken.append((start, end))
            found.append(
                {
                    "phrase": text[start:end],
                    "sign": term.sign,
                    "explanation": term.explanation,
                    "start": start,
                    "end": end,
                }
            )
    return sorted(found, key=lambda k: k["start"])
