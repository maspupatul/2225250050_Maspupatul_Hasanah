"""Classes with join codes: teacher creates, student joins, dashboard filters per class."""

import random
import secrets

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.security import hash_password
from app.db.database import SessionLocal
from app.db.models import SchoolClass, User
from app.main import app
from app.services.classes import (
    CODE_ALPHABET,
    CODE_PATTERN,
    generate_class_code,
    migrate_legacy_classes,
    normalize_class_code,
)

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


def new_class(teacher: dict, name: str) -> dict:
    res = client.post(f"{API}/guru/classes", json={"class_name": name}, headers=auth(teacher["token"]))
    assert res.status_code == 201, res.text
    return res.json()


def new_student(class_code: str | None = None) -> dict:
    body = {"role": "siswa", "name": "Siswa", "username": unique("s"), "password": "123456",
            "parent_consent": True, "class_code": class_code}
    res = client.post(f"{API}/auth/register", json=body)
    assert res.status_code == 201, res.text
    return res.json()


# ------------------------------------------------------------------ pure helpers


def test_generated_codes_are_six_unambiguous_characters():
    rng = random.Random(7)
    codes = {generate_class_code(rng.choice) for _ in range(200)}
    assert len(codes) == 200
    assert all(CODE_PATTERN.match(c) for c in codes)
    assert not set("".join(codes)) & set("01OIL")
    assert set(CODE_ALPHABET) >= set("".join(codes))


def test_codes_are_normalized():
    assert normalize_class_code(" zm7-a92 ") == "ZM7A92"
    assert normalize_class_code("") is None and normalize_class_code(None) is None


# ------------------------------------------------------------------ teacher: classes


def test_teacher_creates_and_lists_classes_with_student_counts():
    teacher = new_teacher()
    a = new_class(teacher, "vii-a")
    b = new_class(teacher, "VII-B")
    assert a["class_name"] == "VII-A" and CODE_PATTERN.match(a["class_code"]) and a["student_count"] == 0
    assert a["class_code"] != b["class_code"]
    new_student(a["class_code"])
    new_student(a["class_code"].lower())
    listed = client.get(f"{API}/guru/classes", headers=auth(teacher["token"])).json()
    assert [(c["class_name"], c["student_count"]) for c in listed] == [("VII-A", 2), ("VII-B", 0)]


def test_class_names_are_unique_per_teacher_only():
    teacher = new_teacher()
    new_class(teacher, "VII-C")
    dup = client.post(f"{API}/guru/classes", json={"class_name": " vii-c "}, headers=auth(teacher["token"]))
    assert dup.status_code == 409 and dup.json()["error"]["code"] == "CLASS_NAME_TAKEN"
    new_class(new_teacher(), "VII-C")  # another teacher may use the same name
    blank = client.post(f"{API}/guru/classes", json={"class_name": "   "}, headers=auth(teacher["token"]))
    assert blank.status_code == 400


def test_students_cannot_manage_classes():
    student = new_student()
    assert client.get(f"{API}/guru/classes", headers=auth(student["token"])).status_code == 403
    assert client.post(f"{API}/guru/classes", json={"class_name": "X"},
                       headers=auth(student["token"])).status_code == 403


def test_summary_filters_by_class_and_never_shows_other_teachers_classes():
    teacher = new_teacher()
    a, b = new_class(teacher, "VII-A"), new_class(teacher, "VII-B")
    sa, sb = new_student(a["class_code"]), new_student(b["class_code"])
    outsider_class = new_class(new_teacher(), "VII-Z")
    so = new_student(outsider_class["class_code"])
    headers = auth(teacher["token"])

    every = client.get(f"{API}/guru/students-summary", headers=headers).json()
    assert {s["id"] for s in every["students"]} == {sa["user"]["id"], sb["user"]["id"]}
    assert every["kelas"] is None and every["class_count"] == 2

    only_a = client.get(f"{API}/guru/students-summary", params={"class_code": a["class_code"].lower()},
                        headers=headers).json()
    assert [s["id"] for s in only_a["students"]] == [sa["user"]["id"]]
    assert only_a["kelas"] == "VII-A" and only_a["students"][0]["kelas"] == "VII-A"
    assert only_a["class"]["total_students"] == 1

    foreign = client.get(f"{API}/guru/students-summary", params={"class_code": outsider_class["class_code"]},
                         headers=headers)
    assert foreign.status_code == 404
    assert client.get(f"{API}/guru/students/{so['user']['id']}", headers=headers).status_code == 404
    assert client.get(f"{API}/guru/students/{sb['user']['id']}", headers=headers).status_code == 200


def test_new_teacher_without_classes_sees_nobody():
    data = client.get(f"{API}/guru/students-summary", headers=auth(new_teacher()["token"])).json()
    assert data["students"] == [] and data["class_count"] == 0


# ------------------------------------------------------------------ student: join code


def test_register_rejects_an_unknown_class_code():
    username = unique("s")
    res = client.post(f"{API}/auth/register", json={
        "role": "siswa", "name": "Siswa", "username": username, "password": "123456",
        "parent_consent": True, "class_code": "QQQQQQ"})
    assert res.status_code == 400 and res.json()["error"]["code"] == "CLASS_CODE_INVALID"
    with SessionLocal() as db:  # no half-made account
        assert db.scalar(select(User).where(User.username == username)) is None


def test_register_without_code_and_join_later_from_profile():
    teacher = new_teacher()
    a, b = new_class(teacher, "VII-D"), new_class(teacher, "VII-E")
    student = new_student()
    assert student["user"]["class_code"] is None and student["user"]["kelas"] is None
    headers = auth(student["token"])

    joined = client.put(f"{API}/auth/me/class", json={"class_code": a["class_code"].lower()}, headers=headers)
    assert joined.status_code == 200 and joined.json()["kelas"] == "VII-D"
    moved = client.put(f"{API}/auth/me/class", json={"class_code": b["class_code"]}, headers=headers).json()
    assert moved["class_code"] == b["class_code"]
    assert client.get(f"{API}/auth/me", headers=headers).json()["kelas"] == "VII-E"

    bad = client.put(f"{API}/auth/me/class", json={"class_code": "QQQQQQ"}, headers=headers)
    assert bad.status_code == 400
    assert client.get(f"{API}/auth/me", headers=headers).json()["class_code"] == b["class_code"]  # unchanged

    left = client.put(f"{API}/auth/me/class", json={"class_code": None}, headers=headers).json()
    assert left["class_code"] is None


def test_guessing_class_codes_is_throttled():
    headers = auth(new_student()["token"])
    for _ in range(5):
        assert client.put(f"{API}/auth/me/class", json={"class_code": "QQQQQQ"}, headers=headers).status_code == 400
    assert client.put(f"{API}/auth/me/class", json={"class_code": "QQQQQQ"}, headers=headers).status_code == 429


def test_teachers_cannot_use_the_student_join_endpoint():
    res = client.put(f"{API}/auth/me/class", json={"class_code": None}, headers=auth(new_teacher()["token"]))
    assert res.status_code == 403


# ------------------------------------------------------------------ legacy migration


def test_legacy_free_text_classes_are_migrated_once():
    tag = secrets.token_hex(2).upper()[:3]
    legacy = f"8{tag}"
    with SessionLocal() as db:
        teacher = User(name="Guru Lama", username=unique("lama"), password_hash=hash_password("rahasia123"),
                       role="guru", kelas=legacy)
        pupil = User(name="Siswa Lama", username=unique("murid"), password_hash=hash_password("123456"),
                     role="siswa", kelas=legacy, parent_consent=True)
        stranger = User(name="Kelas Lain", username=unique("lain"), password_hash=hash_password("123456"),
                        role="siswa", kelas=f"9{tag}", parent_consent=True)
        db.add_all([teacher, pupil, stranger])
        db.commit()
        teacher_id, pupil_id, stranger_id = teacher.id, pupil.id, stranger.id

        assert migrate_legacy_classes(db) >= 1
        made = db.scalars(select(SchoolClass).where(SchoolClass.teacher_id == teacher_id)).all()
        assert [c.class_name for c in made] == [legacy]
        assert db.get(User, pupil_id).class_code == made[0].class_code
        assert db.get(User, stranger_id).class_code is None

        migrate_legacy_classes(db)  # second start: nothing new
        assert len(db.scalars(select(SchoolClass).where(SchoolClass.teacher_id == teacher_id)).all()) == 1
