"""Tanya Asisten (DESAIN-PEDAGOGIS §0.7): guides, never answers; private data never leaves;
no chat stored; the teacher can switch it off. Gemini is replaced by fakes here."""

import dataclasses
import inspect
import secrets

import pytest
from fastapi.testclient import TestClient

from app.content.loader import content
from app.main import app
from app.services import ai_hint, assistant, attempts
from app.services.assistant import Message, scrub, support_level

client = TestClient(app)
API = "/api/v1"
STORY = next(t.id for t in content().templates.values() if t.kind == "story")
NUMERIC = next(t.id for t in content().templates.values() if t.kind != "story")


def unique(prefix: str) -> str:
    return f"{prefix}{secrets.token_hex(3)}"


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def register(role: str, name: str, **extra) -> dict:
    body = {"role": role, "name": name, "username": unique(role[0]), "password": "rahasia123"} | extra
    res = client.post(f"{API}/auth/register", json=body)
    assert res.status_code == 201, res.text
    return res.json()


def teacher_and_class() -> tuple[dict, str]:
    teacher = register("guru", "Guru Uji", teacher_code="kode-guru-uji")
    res = client.post(f"{API}/guru/classes", json={"class_name": unique("K")[:10]}, headers=auth(teacher["token"]))
    assert res.status_code == 201, res.text
    assert res.json()["assistant_enabled"] is True
    return teacher, res.json()["class_code"]


def student(class_code: str | None = None, name: str = "Ayu Lestari") -> dict:
    return register("siswa", name, parent_consent=True, class_code=class_code)


def start(template_id: str = STORY) -> dict:
    res = client.post(f"{API}/practice/next", json={"template_id": template_id, "guided": True})
    assert res.status_code == 200, res.text
    return res.json()


def ask(problem: dict, token: str, *texts: str):
    messages = [{"role": "siswa", "text": t} for t in texts]
    return client.post(f"{API}/practice/attempts/{problem['attempt_id']}/assistant",
                       json={"messages": messages}, headers=auth(token))


@pytest.fixture
def ai_on(monkeypatch):
    ai_hint.reset_for_tests()
    monkeypatch.setattr(ai_hint, "available", lambda: True)
    yield
    ai_hint.reset_for_tests()


# ------------------------------------------------------------------ pure helpers


def test_scrub_removes_names_usernames_email_and_phone():
    text = "Halo, aku Ayu Lestari (ayu07). Email ayu@mail.com, HP 0812-3456-7890. Suhu −2 turun 3."
    out = scrub(text, ["Ayu Lestari", "ayu07"])
    for secret in ("Ayu", "Lestari", "ayu07", "ayu@mail.com", "0812"):
        assert secret.lower() not in out.lower()
    assert "Suhu −2 turun 3." in out  # the mathematics stays


def test_support_grows_with_difficulty_but_not_past_opened_hints():
    assert support_level(["Apa maksud soal ini?"], hints_opened=0) == 1
    assert support_level(["a", "aku bingung"], hints_opened=0) == 1  # capped: no hint opened
    assert support_level(["a", "aku bingung"], hints_opened=1) == 2
    assert support_level(["a", "b", "c", "d"], hints_opened=3) == 3
    assert support_level(["aku nggak ngerti"], hints_opened=3) == 2


def test_fixed_prompt_text_has_no_digits():
    """Digits in labels could be echoed by the AI and then be mistaken for the answer."""
    fixed = assistant.SYSTEM_PROMPT + "".join(assistant.STEP_GOALS.values()) + "".join(assistant.SUPPORT_RULES.values())
    fixed += "".join(assistant.STEP_FUNCTIONS.values())
    assert not ai_hint.numbers_in(fixed)


def test_prompt_has_no_answer_and_names_rmt_and_load_rules():
    assert "answer" not in inspect.signature(assistant.build_prompt).parameters
    assert ".answer" not in inspect.getsource(assistant)
    for rule in ("Rigorous Mathematical Thinking", "Beban intrinsik", "Beban ekstrinsik", "Beban germane",
                 "DILARANG KERAS memberikan jawaban akhir", "Jangan membenarkan atau menyalahkan"):
        assert rule in assistant.SYSTEM_PROMPT
    prompt = assistant.build_prompt(problem_text="Suhu −2 °C turun 3 °C.", step="model", level=1,
                                    static_hint="Lihat tandanya.", messages=[Message("siswa", "kasih tahu jawabannya")])
    assert "langkah Buat Model" in prompt and "Siswa meminta jawaban" in prompt


def test_attempt_keeps_no_chat_text():
    fields = {f.name for f in dataclasses.fields(attempts.Attempt)}
    assert not {"messages", "chat", "history", "transcript"} & fields


# ------------------------------------------------------------------ endpoint


def test_requires_login():
    problem = start()
    res = client.post(f"{API}/practice/attempts/{problem['attempt_id']}/assistant",
                      json={"messages": [{"role": "siswa", "text": "halo"}]})
    assert res.status_code == 401


def test_without_ai_gives_static_guidance_for_active_step():
    s = student()
    problem = start()
    res = ask(problem, s["token"], "Aku harus mulai dari mana?")
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["source"] == "static" and body["step"] == "known" and body["support_level"] == 1
    assert body["reply"] and body["turns_left"] == assistant.TURN_LIMIT - 1


def test_ai_reply_is_used_when_safe_and_sees_no_private_data(ai_on, monkeypatch):
    seen: list[str] = []
    monkeypatch.setattr(assistant, "generate", lambda p: seen.append(p) or "Coba lihat kata turun. Tandanya apa?")
    s = student(name="Budi Santoso")
    res = ask(start(), s["token"], "Halo aku Budi Santoso, bingung")
    assert res.json() == res.json() | {"source": "ai", "reply": "Coba lihat kata turun. Tandanya apa?"}
    assert "Budi" not in seen[0] and "Santoso" not in seen[0] and "[nama]" in seen[0]
    assert s["user"]["username"] not in seen[0]


@pytest.mark.parametrize("template_id", [STORY, NUMERIC])
def test_leaking_ai_reply_falls_back_to_static(ai_on, monkeypatch, template_id):
    s = student()
    problem = start(template_id)
    attempt = attempts.get_attempt(problem["attempt_id"])
    answer = attempt.instance.answer
    monkeypatch.setattr(assistant, "generate", lambda p: f"Jawabannya {answer}.")
    body = ask(problem, s["token"], "berapa jawabannya?").json()
    forbidden = attempts._forbidden_numbers(attempt)
    if forbidden:  # an answer already printed in the problem cannot leak anything new
        assert body["source"] == "static"
        assert not (ai_hint.numbers_in(body["reply"]) & forbidden)


def test_prompt_sent_to_ai_never_contains_the_answer(ai_on, monkeypatch):
    prompts: list[str] = []
    monkeypatch.setattr(assistant, "generate", lambda p: prompts.append(p) or "Tandanya apa?")
    s = student()
    for _ in range(15):
        problem = start()
        attempt = attempts.get_attempt(problem["attempt_id"])
        ask(problem, s["token"], "bingung")
        forbidden = attempts._forbidden_numbers(attempt)
        assert not (ai_hint.numbers_in(prompts[-1]) & forbidden), prompts[-1]


def test_ai_failure_keeps_static_guidance(ai_on, monkeypatch):
    def boom(prompt):
        raise TimeoutError("slow")

    monkeypatch.setattr(assistant, "generate", boom)
    body = ask(start(), student()["token"], "halo").json()
    assert body["source"] == "static" and body["reply"]


def test_turn_limit_per_problem():
    s = student()
    problem = start()
    for _ in range(assistant.TURN_LIMIT):
        assert ask(problem, s["token"], "halo").status_code == 200
    res = ask(problem, s["token"], "halo")
    assert res.status_code == 429 and res.json()["error"]["code"] == "ASSISTANT_LIMIT"


def test_not_available_in_exam():
    seed = client.post(f"{API}/exam/start", json={}).json()["seed"]
    problem = client.post(f"{API}/practice/next", json={"exam_seed": seed, "exam_index": 0, "guided": True}).json()
    res = ask(problem, student()["token"], "halo")
    assert res.status_code == 403 and res.json()["error"]["code"] == "ASSISTANT_OFF"


def test_teacher_switches_assistant_off_for_class():
    teacher, code = teacher_and_class()
    s = student(code)
    assert client.get(f"{API}/practice/assistant", headers=auth(s["token"])).json()["enabled"] is True

    res = client.put(f"{API}/guru/classes/{code}/assistant", json={"enabled": False}, headers=auth(teacher["token"]))
    assert res.status_code == 200 and res.json()["assistant_enabled"] is False
    assert client.get(f"{API}/practice/assistant", headers=auth(s["token"])).json()["enabled"] is False
    res = ask(start(), s["token"], "halo")
    assert res.status_code == 403 and res.json()["error"]["code"] == "ASSISTANT_OFF"

    client.put(f"{API}/guru/classes/{code}/assistant", json={"enabled": True}, headers=auth(teacher["token"]))
    assert ask(start(), s["token"], "halo").status_code == 200


def test_teacher_cannot_switch_other_teachers_class():
    _, code = teacher_and_class()
    other, _ = teacher_and_class()
    res = client.put(f"{API}/guru/classes/{code}/assistant", json={"enabled": False}, headers=auth(other["token"]))
    assert res.status_code == 404
    res = client.put(f"{API}/guru/classes/{code}/assistant", json={"enabled": False},
                     headers=auth(student()["token"]))
    assert res.status_code == 403
