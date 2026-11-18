"""Accounts, roles, progress sync and the teacher dashboard."""

import secrets

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.security import hash_password, verify_password
from app.db.database import SessionLocal
from app.db.models import User
from app.main import app

client = TestClient(app)
API = "/api/v1"


def unique(prefix: str) -> str:
    return f"{prefix}{secrets.token_hex(3)}"


DEMO_CODE = "ZM7A92"  # class VII-A of the demo teacher


def register_student(class_code: str | None = DEMO_CODE, **extra) -> dict:
    body = {"role": "siswa", "name": "Siswa Uji", "username": unique("s"), "password": "123456",
            "class_code": class_code, "parent_consent": True} | extra
    res = client.post(f"{API}/auth/register", json=body)
    assert res.status_code == 201, res.text
    return res.json()


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def login(username: str, password: str, role: str | None = None):
    return client.post(f"{API}/auth/login", json={"username": username, "password": password, "role": role})


# ------------------------------------------------------------------ passwords & tokens


def test_password_is_hashed_with_salt():
    a, b = hash_password("123456"), hash_password("123456")
    assert a != b and "123456" not in a
    assert verify_password("123456", a) and not verify_password("654321", a)
    assert not verify_password("123456", "broken")


def test_stored_password_is_never_plain_text():
    session = register_student()
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.username == session["user"]["username"]))
        assert user.password_hash.startswith("pbkdf2_sha256$") and "123456" not in user.password_hash


# ------------------------------------------------------------------ register & login


def test_student_register_login_and_me():
    session = register_student()
    assert session["user"]["role"] == "siswa" and session["user"]["kelas"] == "VII-A"
    assert session["user"]["class_code"] == DEMO_CODE
    assert session["progress"]["lessons"] == {}
    username = session["user"]["username"]
    res = login(username.upper(), "123456", "siswa")  # usernames are case-insensitive
    assert res.status_code == 200 and res.json()["token"]
    me = client.get(f"{API}/auth/me", headers=auth(res.json()["token"])).json()
    assert me["username"] == username


def test_student_needs_parent_consent():
    res = client.post(f"{API}/auth/register", json={
        "role": "siswa", "name": "Tanpa Izin", "username": unique("t"), "password": "123456"})
    assert res.status_code == 400 and res.json()["error"]["code"] == "CONSENT_REQUIRED"


def test_duplicate_username_and_wrong_password():
    username = register_student()["user"]["username"]
    dup = client.post(f"{API}/auth/register", json={
        "role": "siswa", "name": "Lagi", "username": username, "password": "123456", "parent_consent": True})
    assert dup.status_code == 409
    wrong = login(username, "000000")
    assert wrong.status_code == 401 and wrong.json()["error"]["code"] == "LOGIN_FAILED"
    unknown = login(unique("nobody"), "000000")
    assert unknown.json()["error"]["message"] == wrong.json()["error"]["message"]  # no user enumeration


def test_login_is_throttled_after_repeated_failures():
    username = register_student()["user"]["username"]
    for _ in range(5):
        assert login(username, "999999").status_code == 401
    blocked = login(username, "123456")
    assert blocked.status_code == 429


def test_teacher_signup_needs_the_school_code():
    body = {"role": "guru", "name": "Pak Guru", "username": unique("g"), "password": "rahasia123"}
    assert client.post(f"{API}/auth/register", json=body).status_code == 403
    assert client.post(f"{API}/auth/register", json=body | {"teacher_code": "salah"}).status_code == 403
    short = client.post(f"{API}/auth/register", json=body | {"teacher_code": "kode-guru-uji", "password": "123456"})
    assert short.status_code == 400
    ok = client.post(f"{API}/auth/register", json=body | {"teacher_code": "kode-guru-uji"})
    # teachers no longer type a class at sign-up: they create classes in the dashboard
    assert ok.status_code == 201 and ok.json()["user"]["kelas"] is None and "progress" not in ok.json()


def test_role_is_checked_at_login():
    res = login("guru", "guru123", "siswa")
    assert res.status_code == 403 and res.json()["error"]["code"] == "WRONG_ROLE"
    assert login("guru", "guru123", "guru").status_code == 200


# ------------------------------------------------------------------ role guards


def test_student_cannot_open_teacher_endpoints_and_vice_versa():
    student = register_student()
    teacher = login("guru", "guru123").json()
    assert client.get(f"{API}/guru/students-summary", headers=auth(student["token"])).status_code == 403
    assert client.post(f"{API}/progress/sync", json={}, headers=auth(teacher["token"])).status_code == 403
    assert client.get(f"{API}/guru/students-summary").status_code == 401
    assert client.get(f"{API}/guru/students-summary", headers=auth("tampered.token.value")).status_code == 401


# ------------------------------------------------------------------ progress sync


def test_sync_merges_and_is_returned_at_next_login():
    session = register_student()
    headers = auth(session["token"])
    first = {
        "lessons": {"m1-t1": {"status": "done", "segment": 0, "mastery": 0.8},
                    "nope": {"status": "done", "segment": 0, "mastery": 1}},
        "stats": {"correct": 5, "selfFound": 3, "hintsUsed": 2, "deferred": 0},
        "examResults": [{"score": 60, "date": "2026-11-10"}],
        "activeDays": ["2026-11-10"],
        "reviewQueue": [],
    }
    merged = client.post(f"{API}/progress/sync", json=first, headers=headers).json()
    assert "nope" not in merged["lessons"]
    # another device: less mastery on m1-t1 but a new lesson, more hints, another exam
    second = {
        "lessons": {"m1-t1": {"status": "in_progress", "segment": 3, "mastery": 0.4},
                    "m1-t2": {"status": "done", "segment": 0, "mastery": 0.6}},
        "stats": {"correct": 4, "selfFound": 1, "hintsUsed": 6, "deferred": 1},
        "examResults": [{"score": 82, "date": "2026-11-12"}],
        "activeDays": ["2026-11-12"],
        "reviewQueue": [],
    }
    merged = client.post(f"{API}/progress/sync", json=second, headers=headers).json()
    assert merged["lessons"]["m1-t1"] == {"status": "done", "segment": 3, "mastery": 0.8}
    assert merged["stats"] == {"correct": 5, "selfFound": 3, "hintsUsed": 6, "deferred": 1}
    assert [e["score"] for e in merged["examResults"]] == [60, 82]
    again = login(session["user"]["username"], "123456").json()
    assert again["progress"]["lessons"]["m1-t2"]["status"] == "done"


def test_sync_rejects_impossible_values():
    headers = auth(register_student()["token"])
    bad = {"lessons": {"m1-t1": {"status": "done", "segment": 0, "mastery": 7}}}
    assert client.post(f"{API}/progress/sync", json=bad, headers=headers).status_code == 400


# ------------------------------------------------------------------ teacher dashboard


def test_teacher_sees_only_own_class():
    other_teacher = client.post(f"{API}/auth/register", json={
        "role": "guru", "name": "Guru Lain", "username": unique("g"), "password": "rahasia123",
        "teacher_code": "kode-guru-uji"}).json()
    other_class = client.post(f"{API}/guru/classes", json={"class_name": "9C"},
                              headers=auth(other_teacher["token"])).json()
    mine = register_student(class_code="zm7a92", name="Anggota Kelas")  # codes are case-insensitive
    other = register_student(class_code=other_class["class_code"], name="Kelas Lain")
    teacher = login("guru", "guru123").json()
    data = client.get(f"{API}/guru/students-summary", headers=auth(teacher["token"])).json()
    ids = {s["id"] for s in data["students"]}
    assert mine["user"]["id"] in ids and other["user"]["id"] not in ids
    assert data["kelas"] is None and data["class_count"] >= 1 and len(data["modules"]) == 4
    assert data["class"]["total_students"] == len(data["students"])
    detail = client.get(f"{API}/guru/students/{other['user']['id']}", headers=auth(teacher["token"]))
    assert detail.status_code == 404


def test_demo_data_shows_three_statuses_and_weak_lessons():
    teacher = login("guru", "guru123").json()
    data = client.get(f"{API}/guru/students-summary", headers=auth(teacher["token"])).json()
    by_name = {s["username"]: s for s in data["students"]}
    assert by_name["ayu"]["status"] == "tuntas"
    assert by_name["citra"]["status"] == "perlu_bimbingan"
    detail = client.get(f"{API}/guru/students/{by_name['citra']['id']}", headers=auth(teacher["token"])).json()
    assert detail["weak_lessons"] and detail["weak_lessons"][0]["mastery"] <= detail["weak_lessons"][-1]["mastery"]
    assert "password_hash" not in str(detail)
