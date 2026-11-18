"""Database glue for accounts and progress (the logic lives in progress_report.py)."""

from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.content.loader import content
from app.core.security import hash_password
from app.db.models import ROLE_STUDENT, ROLE_TEACHER, StudentProgress, User
from app.services.classes import classes_of, create_class
from app.services.progress_report import empty_snapshot, merge_snapshots, student_report


def normalize_username(username: str) -> str:
    return username.strip().lower()


def user_out(user: User) -> dict:
    """`kelas` is the display name of the student's class ("VII-A"), `class_code` its join code."""
    joined = user.school_class
    return {
        "id": user.id,
        "name": user.name,
        "username": user.username,
        "role": user.role,
        "kelas": joined.class_name if joined else None,
        "class_code": joined.class_code if joined else None,
    }


def get_by_username(db: Session, username: str) -> User | None:
    return db.scalar(select(User).where(User.username == normalize_username(username)))


# ------------------------------------------------------------------ progress rows


def snapshot_of(row: StudentProgress | None) -> dict:
    if row is None:
        return empty_snapshot()
    return {
        "lessons": dict(row.lessons or {}),
        "stats": {"correct": row.correct, "selfFound": row.self_found, "hintsUsed": row.hints_used, "deferred": row.deferred},
        "examResults": list(row.exam_history or []),
        "activeDays": list(row.active_days or []),
        "reviewQueue": list(row.review_queue or []),
    }


def save_snapshot(db: Session, user: User, incoming: dict) -> dict:
    row = user.progress
    known = set(content().lessons)
    merged = merge_snapshots(snapshot_of(row), incoming, known)
    if row is None:
        row = StudentProgress(user_id=user.id)
        db.add(row)
    row.lessons = merged["lessons"]
    stats = merged["stats"]
    row.correct, row.self_found = stats["correct"], stats["selfFound"]
    row.hints_used, row.deferred = stats["hintsUsed"], stats["deferred"]
    row.exam_history = merged["examResults"]
    row.exam_best = max((e["score"] for e in merged["examResults"]), default=None)
    row.active_days = merged["activeDays"]
    row.review_queue = merged["reviewQueue"]
    db.commit()
    return merged


def lesson_info() -> dict[str, dict]:
    c = content()
    order = c.lesson_order()
    return {lid: {"number": order.index(lid) + 1, "title": c.lessons[lid]["title"]} for lid in order}


def report_for(user: User, today: date | None = None) -> dict:
    report = student_report(snapshot_of(user.progress), content().modules, lesson_info(), today or date.today())
    return user_out(user) | report


def teacher_codes(db: Session, teacher: User) -> list[str]:
    return [c.class_code for c in classes_of(db, teacher)]


def students_of(db: Session, teacher: User, codes: list[str] | None = None) -> list[User]:
    """A teacher only sees students of their own classes (docs/KEAMANAN-PRIVASI.md §4).
    `codes` narrows the result to some of those classes; it never widens it."""
    own = teacher_codes(db, teacher)
    wanted = [c for c in (own if codes is None else codes) if c in own]
    if not wanted:
        return []
    stmt = select(User).where(User.role == ROLE_STUDENT, User.class_code.in_(wanted)).order_by(User.name)
    return list(db.scalars(stmt))


def teaches(db: Session, teacher: User, student: User) -> bool:
    return student.role == ROLE_STUDENT and student.class_code is not None         and student.class_code in teacher_codes(db, teacher)


# ------------------------------------------------------------------ demo data

DEMO_CLASS = "VII-A"
DEMO_CLASS_CODE = "ZM7A92"


def seed_demo(db: Session) -> None:
    """Demo accounts for trying the app: guru / guru123 and three students (PIN 123456).
    Only runs on an empty database and only when ZMATH_SEED_DEMO=1 (the default in development)."""
    if db.scalar(select(func.count()).select_from(User)):
        return
    teacher = User(name="Bu Guru Demo", username="guru", password_hash=hash_password("guru123"), role=ROLE_TEACHER)
    db.add(teacher)
    db.flush()
    create_class(db, teacher, DEMO_CLASS, code=DEMO_CLASS_CODE)
    today = date.today()
    order = content().lesson_order()
    demo = [
        # name, username, lessons done, mastery, exam scores, stats, active days back
        ("Ayu Lestari", "ayu", len(order), 0.9, [78, 88], (52, 40, 9, 0), 12),
        ("Bima Pratama", "bima", 7, 0.75, [], (30, 18, 14, 1), 4),
        ("Citra Dewi", "citra", 3, 0.45, [], (9, 2, 21, 4), 2),
    ]
    for name, username, done_count, mastery, exams, (correct, self_found, hints, deferred), days in demo:
        student = User(name=name, username=username, password_hash=hash_password("123456"),
                       role=ROLE_STUDENT, class_code=DEMO_CLASS_CODE, parent_consent=True)
        db.add(student)
        db.flush()
        lessons = {lid: {"status": "done", "segment": 0, "mastery": mastery} for lid in order[:done_count]}
        if done_count < len(order):
            lessons[order[done_count]] = {"status": "in_progress", "segment": 1, "mastery": 0}
        db.add(StudentProgress(
            user_id=student.id, lessons=lessons, correct=correct, self_found=self_found,
            hints_used=hints, deferred=deferred,
            exam_history=[{"score": s, "date": (today - timedelta(days=3 - i)).isoformat()} for i, s in enumerate(exams)],
            exam_best=max(exams) if exams else None,
            active_days=[(today - timedelta(days=d)).isoformat() for d in range(days)][::-1],
            review_queue=[{"templateId": "num-div2", "lessonId": "m5-t3", "addedAt": today.isoformat()}] if deferred >= 4 else [],
        ))
    db.commit()
