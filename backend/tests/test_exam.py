"""Ujian Akhir: deterministic, gradual (easy → HOTS), and never a copy of practice."""

from collections import Counter

import pytest
from fastapi.testclient import TestClient

from app.content.loader import content
from app.main import app
from app.services.attempts import get_attempt
from app.services.exam import build_plan, start_exam_problem
from app.services.modeling.expr import ExprError, evaluate
from app.services.modeling.instantiate import instantiate
from app.services.modeling.twin import pick_twin_template

client = TestClient(app)
API = "/api/v1"
SEEDS = range(200)


def practice_templates():
    return [t for t in content().templates.values() if t.pool == "practice"]


def practice_accepts(template, values) -> bool:
    """Could the practice generator of `template` ever produce these values?"""
    try:
        for name, spec in template.vars.items():
            lo, hi = spec.range
            v = values[name]
            if v % spec.step or not lo <= v // spec.step <= hi or (spec.nonzero and v == 0):
                return False
        return all(evaluate(c, values) for c in template.constraints)
    except (KeyError, ExprError):
        return False


# ------------------------------------------------------------------ plan


def test_plan_is_deterministic_and_complete():
    config = content().exam
    plan = build_plan(config, 7)
    assert plan == build_plan(config, 7)
    assert len(plan) == sum(len(s.slots) for s in config.stages) == 12
    assert [item.index for item in plan] == list(range(12))


@pytest.mark.parametrize("seed", SEEDS)
def test_plan_goes_from_basic_to_hots(seed):
    plan = build_plan(content().exam, seed)
    templates = content().templates
    levels = [item.level for item in plan]
    assert levels == sorted(levels)
    assert levels[0] == 1 and levels[-1] == 3
    assert [i.stage for i in plan][:4] == ["dasar"] * 4
    assert [i.stage for i in plan][-4:] == ["hots"] * 4
    # every problem in one exam is a different template, all from the exam bank
    ids = [item.template_id for item in plan]
    assert len(set(ids)) == len(ids)
    assert all(templates[i].pool == "exam" for i in ids)
    # the template difficulty matches the stage
    assert all(templates[i.template_id].level == i.level for i in plan)


def test_plan_covers_all_operations():
    templates = content().templates
    for seed in range(20):
        schemas = {templates[i.template_id].schema_type for i in build_plan(content().exam, seed)}
        assert {"REP", "MUL", "DIV", "MIX", "PRT", "SCR", "CHG"} <= schemas
        assert schemas & {"ADD", "SUB"}
        assert schemas & {"DIST", "DIV2"}  # properties of multiplication and division
        assert schemas & {"CMP", "RPT"}


def test_different_seeds_vary_templates_and_numbers():
    config = content().exam
    picks = Counter(build_plan(config, s)[0].template_id for s in SEEDS)
    assert len(picks) == 3  # every alternative of the first slot gets used
    values = {
        tuple(sorted(instantiate(content().templates[p.template_id], p.seed).values.items()))
        for s in SEEDS[:40]
        for p in build_plan(config, s)[4:5]
    }
    assert len(values) > 20  # the same slot gets many different numbers


# ------------------------------------------------------------------ not a copy of practice


def test_exam_stories_have_new_narratives():
    practice_texts = {t.text for t in practice_templates()}
    for t in content().templates.values():
        if t.pool == "exam" and t.kind != "numeric":
            assert t.text not in practice_texts, t.id


def test_lessons_never_practise_exam_templates():
    c = content()
    exam_ids = {t.id for t in c.templates.values() if t.pool == "exam"}
    for lesson in c.lessons.values():
        assert exam_ids.isdisjoint(lesson["practice"]["templates"]), lesson["id"]


def test_practice_twins_never_use_exam_templates():
    templates = content().templates
    for t in practice_templates():
        assert all(c.pool == "practice" for c in pick_twin_template(t, templates)), t.id


@pytest.mark.parametrize("seed", range(60))
def test_exam_numbers_are_impossible_in_practice(seed):
    """Numeric exam problems share the 'Hitunglah' wording, so their numbers must
    lie outside everything the practice generator of the same operation can make."""
    c = content()
    for item in build_plan(c.exam, seed):
        exam_template = c.templates[item.template_id]
        if exam_template.kind != "numeric":
            continue
        values = instantiate(exam_template, item.seed).values
        for p in practice_templates():
            if p.schema_type == exam_template.schema_type:
                assert not practice_accepts(p, values), (exam_template.id, p.id, values)


# ------------------------------------------------------------------ API


def test_exam_info_and_start():
    info = client.get(f"{API}/exam").json()
    assert info["total"] == 12
    assert [s["key"] for s in info["stages"]] == ["dasar", "menengah", "hots"]
    started = client.post(f"{API}/exam/start", json={"seed": 123}).json()
    assert started["seed"] == 123 and len(started["items"]) == 12
    assert "template_id" not in started["items"][0]
    assert client.post(f"{API}/exam/start").json()["seed"] >= 0


def test_every_exam_problem_is_served_without_answer():
    seed = client.post(f"{API}/exam/start", json={}).json()["seed"]
    for index in range(12):
        res = client.post(
            f"{API}/practice/next", json={"exam_seed": seed, "exam_index": index, "guided": True}
        )
        assert res.status_code == 200, res.text
        problem = res.json()
        assert problem["exam"]["index"] == index and problem["exam"]["total"] == 12
        assert "answer" not in problem and "review" not in problem


def test_exam_problem_is_reproducible_and_bounded():
    a = start_exam_problem(exam_seed=5, index=8, guided=False)
    b = start_exam_problem(exam_seed=5, index=8, guided=False)
    assert a["text"] == b["text"] and a["attempt_id"] != b["attempt_id"]
    res = client.post(f"{API}/practice/next", json={"exam_seed": 5, "exam_index": 12})
    assert res.status_code == 404


def test_hots_score_problem_full_flow():
    seed = next(s for s in SEEDS if build_plan(content().exam, s)[-1].template_id == "ex-score")
    problem = client.post(
        f"{API}/practice/next", json={"exam_seed": seed, "exam_index": 11, "guided": True}
    ).json()
    aid = problem["attempt_id"]
    attempt = get_attempt(aid)
    v = attempt.instance.values

    def step(key, answer):
        return client.post(
            f"{API}/practice/attempts/{aid}/steps", json={"step": key, "answer": answer}
        ).json()

    assert step("known", sorted(attempt.instance.givens.values()))["correct"]
    assert step("asked", attempt.asked_correct)["correct"]
    assert step("model", f"{v['b']} × {v['p']} + {v['s']} × ({v['m']})")["correct"]
    assert step("result", attempt.instance.answer)["interpret_options"]
    final = step("interpret", attempt.interpret_correct)
    assert final["attempt_status"] == "correct"
    assert final["review"]["visual"]["marks"][-1]["value"] == attempt.instance.answer
