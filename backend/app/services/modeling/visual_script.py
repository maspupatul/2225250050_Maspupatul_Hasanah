"""Build `VisualScript` objects for the frontend visuals (docs/VISUALISASI.md §3).

Modes:
- explore: problem view, only given states, interactive pointer
- hint:    given states + direction-only arrows, NEVER the end position
- review:  full path including the answer (only after the student is correct)
"""

from __future__ import annotations

from app.services.modeling.expr import fmt_int, fmt_operand
from app.services.modeling.instantiate import format_value
from app.services.modeling.schema import Context, Template

STATE_FMTS = {"state", "state_words", "plain"}
DEFAULT_LABELS = {"start": "awal", "end": "akhir", "a": "", "b": ""}


def _base(template: Template, context: Context, mode: str) -> dict:
    return {
        "kind": context.visual,
        "unit": context.unit,
        "range": list(context.range),
        "step": context.step,
        "thousands": context.thousands,
        "marks": [],
        "arrows": [],
        "pointer": None,
        "showEnd": False,
        "mode": mode,
    }


def _dir(value: int) -> str:
    return "up" if value > 0 else "down"


def _label(template: Template, name: str) -> str:
    return template.labels.get(name, DEFAULT_LABELS.get(name, ""))


def _signed_label(value: int, context: Context, op: str = "+") -> str:
    return f"{op} {fmt_int(value, context.thousands)}" if value >= 0 else f"{op} ({fmt_int(value, context.thousands)})"


def _state_marks(template: Template, givens: dict[str, int]) -> list[dict]:
    return [
        {"value": value, "label": _label(template, name), "tone": "given"}
        for name, value in givens.items()
        if template.fmt_of(name) in STATE_FMTS
    ]


def explore(template: Template, context: Context, givens: dict[str, int]) -> dict:
    script = _base(template, context, "explore")
    script["marks"] = _state_marks(template, givens)
    script["pointer"] = script["marks"][0]["value"] if script["marks"] else 0
    return script


def hint(template: Template, context: Context, givens: dict[str, int]) -> dict:
    """Hint level 2. Receives only the given quantities, so it cannot show the answer."""
    script = _base(template, context, "hint")
    script["marks"] = _state_marks(template, givens)
    arrows: list[dict] = []
    st, unknown = template.schema_type, template.unknown

    def arrow(at: int, value: int, label: str, anchor: str = "from") -> dict:
        return {"at": at, "anchor": anchor, "dir": _dir(value), "value": None, "label": label}

    if template.kind == "numeric" and st == "MUL":
        # a × b = b added a times (a < 0: the opposite of b, |a| times)
        a, b = givens["a"], givens["b"]
        script["marks"] = [{"value": 0, "label": "mulai", "tone": "given"}]
        label = (
            f"{fmt_operand(b)} sebanyak {abs(a)} kali"
            if a > 0
            else f"lawan dari {fmt_operand(b)}, sebanyak {abs(a)} kali"
        )
        arrows.append(arrow(0, b if a > 0 else -b, label))
    elif template.kind == "numeric" and st == "DIV":
        # how many jumps of b lead from 0 to a? (the count itself is never drawn)
        a, b = givens["a"], givens["b"]
        script["marks"] = [
            {"value": 0, "label": "mulai", "tone": "given"},
            {"value": a, "label": "tujuan", "tone": "given"},
        ]
        arrows.append(arrow(0, b, f"lompatan {fmt_operand(b)}"))
    elif template.kind == "numeric" and {"a", "b"} <= givens.keys():
        a, b = givens["a"], givens["b"]
        if st == "SUB":
            arrows.append(arrow(a, -b, _signed_label(b, context, "−")))
        else:
            arrows.append(arrow(a, b, _signed_label(b, context, "+")))
    elif st in {"CHG", "MLT"} and unknown == "end":
        changes = [n for n in template.given if template.fmt_of(n) == "change"]
        start = givens.get("start", 0)
        arrows.extend(
            arrow(start, givens[n], format_value(context, "change", givens[n])) for n in changes
        )
    elif st == "CHG" and unknown == "start":
        arrows.append(
            arrow(givens["end"], givens["change"],
                  format_value(context, "change", givens["change"]), anchor="to")
        )
    elif st == "CMB":
        script["marks"] = [{"value": 0, "label": "awal", "tone": "given"}]
        arrows.extend(
            arrow(0, givens[n], format_value(context, template.fmt_of(n), givens[n]))
            for n in template.given
        )
    elif st == "MLT" and unknown == "change":
        # only the first change is known; the second one is what the student looks for
        arrows.append(
            arrow(givens["start"], givens["c1"], format_value(context, "change", givens["c1"]))
        )
    elif st == "RPT":
        start = givens.get("start", 0)
        if "start" not in givens:
            script["marks"] = [{"value": 0, "label": "awal", "tone": "given"}]
        r, n = givens["r"], givens["n"]
        arrows.append(arrow(start, r, f"{format_value(context, 'change', r)} × {n}"))
    elif st == "PRT":
        script["marks"] = [{"value": 0, "label": "awal", "tone": "given"}]
        if "total" in givens and template.fmt_of("total") == "change":
            total = givens["total"]
            arrows.append(arrow(0, total, format_value(context, "change", total)))
        elif "total" in givens:
            script["marks"].append({"value": givens["total"], "label": "total", "tone": "given"})
        else:  # several amounts are combined first, then shared
            arrows.extend(
                arrow(0, givens[n], format_value(context, template.fmt_of(n), givens[n]))
                for n in template.given
                if template.fmt_of(n) != "count"
            )
    elif st == "SCR":
        script["marks"] = [{"value": 0, "label": "awal", "tone": "given"}]
        p, m, b, s = givens["p"], givens["m"], givens["b"], givens["s"]
        arrows.append(arrow(0, p, f"benar: {b} × {p}"))
        arrows.append(arrow(0, m, f"salah: {s} × {fmt_operand(m)}"))
    script["arrows"] = arrows
    return script


def review(template: Template, context: Context, values: dict[str, int], answer: int) -> dict:
    """Full worked path. Only used after a correct answer or for a twin example."""
    script = _base(template, context, "review")
    script["showEnd"] = True
    marks: list[dict] = []
    arrows: list[dict] = []
    st, unknown = template.schema_type, template.unknown

    def arrow(at: int, value: int, label: str) -> dict:
        return {"at": at, "anchor": "from", "dir": _dir(value), "value": value, "label": label}

    if template.kind == "represent":
        marks.append({"value": answer, "label": "", "tone": "end"})
    elif template.kind == "numeric" and st == "MUL":
        a, b = values["a"], values["b"]
        jump, op = (b, "+") if a > 0 else (-b, "−")
        marks += [{"value": 0, "label": "mulai", "tone": "start"},
                  {"value": answer, "label": "hasil", "tone": "end"}]
        position = 0
        for _ in range(abs(a)):
            arrows.append(arrow(position, jump, _signed_label(b, context, op)))
            position += jump
    elif template.kind == "numeric" and st == "DIV":
        a = values["a"]
        jump = a // abs(answer)  # exact: a = answer × b
        marks += [{"value": 0, "label": "mulai", "tone": "start"},
                  {"value": a, "label": "tujuan", "tone": "end"}]
        position = 0
        for _ in range(abs(answer)):
            arrows.append(arrow(position, jump, fmt_int(jump, context.thousands)))
            position += jump
    elif template.kind == "numeric" and st == "MIX":
        marks.append({"value": answer, "label": "hasil", "tone": "end"})
    elif template.kind == "numeric":
        a, b = values["a"], values["b"]
        delta = -b if st == "SUB" else b
        op = "−" if st == "SUB" else "+"
        marks += [{"value": a, "label": "mulai", "tone": "start"},
                  {"value": answer, "label": "hasil", "tone": "end"}]
        arrows.append(arrow(a, delta, _signed_label(b, context, op)))
    elif st in {"CHG", "MLT"}:
        start = values["start"]
        marks.append({"value": start, "label": _label(template, "start"), "tone": "start"})
        position = start
        for name in [n for n in template.vars if template.fmt_of(n) == "change"]:
            change = values[name]
            arrows.append(arrow(position, change, format_value(context, "change", change)))
            position += change
        marks.append({"value": position, "label": _label(template, "end"), "tone": "end"})
    elif st == "CMP":
        a, b = values["a"], values["b"]
        marks += [{"value": a, "label": _label(template, "a"), "tone": "given"},
                  {"value": b, "label": _label(template, "b"), "tone": "given"}]
        arrows.append(arrow(b, a - b, f"selisih {fmt_int(abs(a - b), context.thousands)}"))
    elif st == "CMB":
        position = 0
        marks.append({"value": 0, "label": "awal", "tone": "start"})
        for name in template.given:
            v = values[name]
            arrows.append(arrow(position, v, format_value(context, template.fmt_of(name), v)))
            position += v
        marks.append({"value": position, "label": "total", "tone": "end"})
    elif st == "RPT":
        position = values.get("start", 0)
        marks.append({"value": position, "label": "awal", "tone": "start"})
        r = values["r"]
        for _ in range(values["n"]):
            arrows.append(arrow(position, r, format_value(context, "change", r)))
            position += r
        marks.append({"value": position, "label": "akhir", "tone": "end"})
    elif st == "PRT":
        n = values["n"]
        part = template.labels.get("part", "bagian")
        marks += [{"value": 0, "label": "awal", "tone": "start"},
                  {"value": answer * n, "label": "total", "tone": "end"}]
        position = 0
        for i in range(n):
            arrows.append(arrow(position, answer, f"{part} {i + 1}"))
            position += answer
    elif st == "SCR":
        p, m, b, s = values["p"], values["m"], values["b"], values["s"]
        marks += [{"value": 0, "label": "awal", "tone": "start"},
                  {"value": answer, "label": "skor", "tone": "end"}]
        arrows.append(arrow(0, b * p, f"benar: {b} × {p}"))
        arrows.append(arrow(b * p, s * m, f"salah: {s} × {fmt_operand(m)}"))
    script["marks"] = marks
    script["arrows"] = arrows
    script["unknown"] = unknown
    return script
