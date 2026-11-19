"""Profil → Ubah kata sandi (students and teachers change their own password)."""

import secrets

from fastapi.testclient import TestClient

from app.db.database import SessionLocal
from app.db.models import User
from app.main import app

client = TestClient(app)
API = "/api/v1"


def unique(prefix: str) -> str:
    return f"{prefix}{secrets.token_hex(3)}"


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def new_student(password: str = "lama123") -> dict:
    res = client.post(f"{API}/auth/register", json={
        "role": "siswa", "name": "Siswa", "username": unique("s"), "password": password, "parent_consent": True})
    assert res.status_code == 201, res.text
    return res.json()


def change(session: dict, current: str, new: str):
    return client.put(f"{API}/auth/me/password", json={"current_password": current, "new_password": new},
                      headers=auth(session["token"]))


def login(username: str, password: str) -> int:
    return client.post(f"{API}/auth/login", json={"username": username, "password": password}).status_code


def test_student_changes_password_and_logs_in_with_the_new_one():
    student = new_student()
    username = student["user"]["username"]
    res = change(student, "lama123", "baru4567")
    assert res.status_code == 200, res.text
    assert res.json()["username"] == username
    assert login(username, "lama123") == 401
    assert login(username, "baru4567") == 200
    with SessionLocal() as db:
        assert "baru4567" not in db.get(User, student["user"]["id"]).password_hash  # hashed


def test_after_a_teacher_reset_the_student_can_choose_their_own_password():
    teacher = client.post(f"{API}/auth/register", json={
        "role": "guru", "name": "Guru", "username": unique("g"), "password": "rahasia123",
        "teacher_code": "kode-guru-uji"}).json()
    code = client.post(f"{API}/guru/classes", json={"class_name": unique("K")[:10]},
                       headers=auth(teacher["token"])).json()["class_code"]
    student = client.post(f"{API}/auth/register", json={
        "role": "siswa", "name": "Siswa", "username": unique("s"), "password": "lupa123",
        "parent_consent": True, "class_code": code}).json()
    temporary = client.post(f"{API}/guru/students/{student['user']['id']}/reset-password",
                            headers=auth(teacher["token"])).json()["temporary_password"]
    assert change(student, temporary, "pilihanku1").status_code == 200
    assert login(student["user"]["username"], "pilihanku1") == 200


def test_wrong_current_password_is_refused_and_nothing_changes():
    student = new_student()
    res = change(student, "salah999", "baru4567")
    assert res.status_code == 400 and res.json()["error"]["code"] == "WRONG_PASSWORD"
    assert login(student["user"]["username"], "lama123") == 200


def test_rules_for_the_new_password():
    student = new_student()
    short = change(student, "lama123", "abc")
    assert short.status_code == 400 and short.json()["error"]["message"] == "Kata sandi baru minimal 6 karakter."
    same = change(student, "lama123", "lama123")
    assert same.status_code == 400 and same.json()["error"]["code"] == "SAME_PASSWORD"


def test_teachers_need_eight_characters():
    teacher = client.post(f"{API}/auth/register", json={
        "role": "guru", "name": "Guru", "username": unique("g"), "password": "rahasia123",
        "teacher_code": "kode-guru-uji"}).json()
    res = change(teacher, "rahasia123", "pendek7")
    assert res.status_code == 400 and "minimal 8" in res.json()["error"]["message"]
    assert change(teacher, "rahasia123", "panjang12345").status_code == 200


def test_guessing_the_current_password_is_throttled():
    student = new_student()
    for _ in range(5):
        change(student, "tebak000", "baru4567")
    res = change(student, "lama123", "baru4567")  # even the right one waits now
    assert res.status_code == 429


def test_login_is_required():
    res = client.put(f"{API}/auth/me/password", json={"current_password": "a", "new_password": "bbbbbb"})
    assert res.status_code == 401
