"""Teacher resets a forgotten student password (temporary password shown once)."""

import secrets

from fastapi.testclient import TestClient

from app.db.database import SessionLocal
from app.db.models import User
from app.main import app
from app.services.accounts import TEMP_PASSWORD_ALPHABET, TEMP_PASSWORD_LENGTH, generate_temporary_password

client = TestClient(app)
API = "/api/v1"


def unique(prefix: str) -> str:
    return f"{prefix}{secrets.token_hex(3)}"


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def new_teacher() -> dict:
    res = client.post(f"{API}/auth/register", json={
        "role": "guru", "name": "Guru Uji", "username": unique("g"), "password": "rahasia123",
        "teacher_code": "kode-guru-uji"})
    assert res.status_code == 201, res.text
    return res.json()


def new_class_code(teacher: dict) -> str:
    res = client.post(f"{API}/guru/classes", json={"class_name": unique("K")[:10]}, headers=auth(teacher["token"]))
    assert res.status_code == 201, res.text
    return res.json()["class_code"]


def new_student(class_code: str | None) -> dict:
    res = client.post(f"{API}/auth/register", json={
        "role": "siswa", "name": "Siswa", "username": unique("s"), "password": "lama123",
        "parent_consent": True, "class_code": class_code})
    assert res.status_code == 201, res.text
    return res.json()


def login(username: str, password: str):
    return client.post(f"{API}/auth/login", json={"username": username, "password": password})


def reset(teacher: dict, student_id: int):
    return client.post(f"{API}/guru/students/{student_id}/reset-password", headers=auth(teacher["token"]))


# ------------------------------------------------------------------ pure helper


def test_temporary_password_shape():
    for _ in range(50):
        pw = generate_temporary_password()
        assert len(pw) == TEMP_PASSWORD_LENGTH >= 6  # meets the student minimum
        assert set(pw) <= set(TEMP_PASSWORD_ALPHABET)
    assert not set("il1o0") & set(TEMP_PASSWORD_ALPHABET)  # no look-alikes
    assert generate_temporary_password(lambda seq: seq[0]) == "aaaaaa"  # reproducible with a fixed choice


# ------------------------------------------------------------------ endpoint


def test_teacher_resets_password_and_student_logs_in_with_it():
    teacher = new_teacher()
    student = new_student(new_class_code(teacher))
    sid, username = student["user"]["id"], student["user"]["username"]

    res = reset(teacher, sid)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["username"] == username
    temporary = body["temporary_password"]

    assert login(username, "lama123").status_code == 401  # the old password no longer works
    assert login(username, temporary).status_code == 200
    with SessionLocal() as db:  # stored hashed, never in plain text
        assert temporary not in db.get(User, sid).password_hash


def test_a_second_reset_replaces_the_first_temporary_password():
    teacher = new_teacher()
    student = new_student(new_class_code(teacher))
    sid, username = student["user"]["id"], student["user"]["username"]
    first = reset(teacher, sid).json()["temporary_password"]
    second = reset(teacher, sid).json()["temporary_password"]
    assert login(username, second).status_code == 200
    if first != second:  # equal only by a 1-in-a-billion chance
        assert login(username, first).status_code == 401


def test_reset_unlocks_a_student_after_too_many_wrong_tries():
    teacher = new_teacher()
    student = new_student(new_class_code(teacher))
    username = student["user"]["username"]
    for _ in range(5):
        login(username, "salah999")
    assert login(username, "lama123").status_code == 429  # locked

    temporary = reset(teacher, student["user"]["id"]).json()["temporary_password"]
    assert login(username, temporary).status_code == 200


def test_only_the_students_own_teacher_can_reset():
    owner, other = new_teacher(), new_teacher()
    new_class_code(other)
    student = new_student(new_class_code(owner))
    sid, username = student["user"]["id"], student["user"]["username"]

    assert reset(other, sid).status_code == 404  # another teacher's student: not visible
    assert login(username, "lama123").status_code == 200  # untouched


def test_reset_is_refused_for_students_without_class_teachers_and_unknown_ids():
    teacher = new_teacher()
    new_class_code(teacher)
    loner = new_student(None)
    assert reset(teacher, loner["user"]["id"]).status_code == 404
    assert reset(teacher, teacher["user"]["id"]).status_code == 404  # never another teacher account
    assert reset(teacher, 10**9).status_code == 404


def test_students_and_guests_cannot_reset():
    teacher = new_teacher()
    student = new_student(new_class_code(teacher))
    res = client.post(f"{API}/guru/students/{student['user']['id']}/reset-password", headers=auth(student["token"]))
    assert res.status_code == 403
    res = client.post(f"{API}/guru/students/{student['user']['id']}/reset-password")
    assert res.status_code == 401
