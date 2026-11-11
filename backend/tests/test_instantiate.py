import pytest

from app.content.loader import content
from app.services.modeling.expr import evaluate, to_int
from app.services.modeling.instantiate import instantiate, render_text
from app.services.modeling.visual_script import STATE_FMTS

SEEDS = range(300)
TEMPLATES = list(content().templates.values())


@pytest.mark.parametrize("template", TEMPLATES, ids=lambda t: t.id)
def test_deterministic(template):
    assert instantiate(template, 42) == instantiate(template, 42)


@pytest.mark.parametrize("template", TEMPLATES, ids=lambda t: t.id)
def test_constraints_and_global_rules(template):
    context = content().contexts[template.context]
    lo, hi = context.range
    for seed in SEEDS:
        inst = instantiate(template, seed)
        values = inst.values
        assert all(evaluate(c, values) for c in template.constraints)
        assert inst.answer == to_int(evaluate(template.model, values))
        assert inst.answer != 0
        given_abs = [abs(v) for v in inst.givens.values()]
        assert len(set(given_abs)) == len(given_abs)
        assert abs(inst.answer) not in given_abs
        # every POSITION the visuals draw must fit in the context range
        # (change amounts such as "turun 6 lantai" are arrows, not positions)
        positions = [v for k, v in values.items() if template.fmt_of(k) in STATE_FMTS]
        if template.answer_fmt == "state" or template.kind != "story":
            positions.append(inst.answer)
        for value in positions:
            assert lo <= value <= hi, (template.id, seed, values)
        text = render_text(template, context, values)
        assert "{" not in text and "}" not in text
