from fastapi.testclient import TestClient

from app.main import app
from app.services.attempts import get_attempt

client = TestClient(app)
API = "/api/v1"


def start(template_id: str, guided: bool = True) -> dict:
    res = client.post(f"{API}/practice/next", json={"template_id": template_id, "guided": guided})
    assert res.status_code == 200, res.text
    return res.json()


def step(attempt_id: str, key: str, answer):
    return client.post(f"{API}/practice/attempts/{attempt_id}/steps", json={"step": key, "answer": answer})


def hint(attempt_id: str, key: str):
    return client.post(f"{API}/practice/attempts/{attempt_id}/hint", json={"step": key})


def test_modules_and_lessons():
    modules = client.get(f"{API}/modules").json()
    assert [m["id"] for m in modules] == ["m1", "m2", "m3", "m4"]
    numbers = [lesson["number"] for m in modules for lesson in m["lessons"]]
    assert numbers == list(range(1, 16))
    assert client.get(f"{API}/lessons/m4-t1").json()["number"] == 6
    assert client.get(f"{API}/lessons/m4-t2").json()["number"] == 7
    lesson = client.get(f"{API}/lessons/m6-t2").json()
    assert lesson["segments"] and "practice" not in lesson
    assert client.get(f"{API}/lessons/nope").json()["error"]["code"] == "NOT_FOUND"


def test_full_guided_story_flow_reveals_review_only_at_the_end():
    problem = start("sea-chg-end")
    aid = problem["attempt_id"]
    attempt = get_attempt(aid)
    inst = attempt.instance

    r = step(aid, "known", sorted(inst.givens.values())).json()
    assert r["correct"] and "review" not in r
    assert step(aid, "asked", attempt.asked_correct).json()["correct"]
    r = step(aid, "model", f"({inst.values['start']}) + ({inst.values['change']})").json()
    assert r["correct"] and r["next_step"] == "result"
    r = step(aid, "result", inst.answer).json()
    assert r["correct"] and r["interpret_options"]
    final = step(aid, "interpret", attempt.interpret_correct).json()
    assert final["attempt_status"] == "correct"
    assert final["mastery_weight"] == 1.0
    assert final["review"]["answer"] == inst.answer
    assert final["review"]["interpretation"]


def test_hint_lock_twin_and_deferral_never_reveal_answer():
    problem = start("num-add")
    aid = problem["attempt_id"]
    answer = get_attempt(aid).instance.answer
    wrong = answer + 100

    assert hint(aid, "result").json()["hint_level"] == 1
    locked = hint(aid, "result")
    assert locked.status_code == 409 and locked.json()["error"]["code"] == "HINT_LOCKED"

    r = step(aid, "result", wrong).json()
    assert r["correct"] is False and "review" not in r and str(answer) not in r["feedback"]
    assert hint(aid, "result").json()["hint_level"] == 2
    step(aid, "result", wrong)
    assert hint(aid, "result").json()["hint_level"] == 3
    assert hint(aid, "result").json()["error"]["code"] == "NO_MORE_HINTS"

    twin_early = client.post(f"{API}/practice/attempts/{aid}/twin")
    assert twin_early.json()["error"]["code"] == "TWIN_NOT_AVAILABLE"
    assert step(aid, "result", wrong).json()["twin_available"] is False
    assert step(aid, "result", wrong).json()["twin_available"] is True

    twin = client.post(f"{API}/practice/attempts/{aid}/twin").json()["twin"]
    assert twin["steps"]

    deferred = step(aid, "result", wrong).json()
    assert deferred["attempt_status"] == "deferred"
    assert "review" not in deferred and "answer" not in deferred
    closed = step(aid, "result", answer)
    assert closed.status_code == 409


def test_step_order_and_validation():
    problem = start("temp-chg-end")
    aid = problem["attempt_id"]
    assert step(aid, "result", 1).status_code == 400
    assert client.post(f"{API}/practice/next", json={}).status_code == 400
    assert step("unknown-id", "known", [1]).status_code == 404
