"""Classes made by teachers and the 6-character codes students use to join them."""

from __future__ import annotations

import re
import secrets
from collections.abc import Callable, Sequence

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.db.models import ROLE_STUDENT, ROLE_TEACHER, SchoolClass, User

# No 0/O, 1/I/L: codes are read aloud and copied from the board by 12-year-olds.
CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
CODE_LENGTH = 6
CODE_PATTERN = re.compile(rf"^[{CODE_ALPHABET}]{{{CODE_LENGTH}}}$")
MAX_CLASSES_PER_TEACHER = 30


def generate_class_code(choice: Callable[[Sequence[str]], str] = secrets.choice) -> str:
    """A random code such as "ZM7A92" (cryptographically random by default)."""
    return "".join(choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))


def normalize_class_code(code: str | None) -> str | None:
    """Upper-case, without spaces or dashes ("zm7-a92 " → "ZM7A92"); None when empty."""
    if not code:
        return None
    cleaned = re.sub(r"[\s-]", "", code).upper()
    return cleaned or None


def normalize_class_name(name: str) -> str:
    return " ".join(name.split()).upper()


def find_class(db: Session, code: str | None) -> SchoolClass | None:
    code = normalize_class_code(code)
    if not code or not CODE_PATTERN.match(code):
        return None
    return db.scalar(select(SchoolClass).where(SchoolClass.class_code == code))


def require_class(db: Session, code: str | None) -> SchoolClass:
    found = find_class(db, code)
    if found is None:
        raise AppError("CLASS_CODE_INVALID", "Kode kelas tidak ditemukan. Cek lagi ke gurumu.", 400)
    return found


def _unique_code(db: Session) -> str:
    for _ in range(20):
        code = generate_class_code()
        if db.scalar(select(SchoolClass.id).where(SchoolClass.class_code == code)) is None:
            return code
    raise AppError("CLASS_CODE_EXHAUSTED", "Kode kelas belum bisa dibuat. Coba lagi.", 503)  # practically never


def classes_of(db: Session, teacher: User) -> list[SchoolClass]:
    stmt = select(SchoolClass).where(SchoolClass.teacher_id == teacher.id).order_by(SchoolClass.created_at, SchoolClass.id)
    return list(db.scalars(stmt))


def create_class(db: Session, teacher: User, class_name: str, code: str | None = None) -> SchoolClass:
    name = normalize_class_name(class_name)
    if not name:
        raise AppError("VALIDATION_ERROR", "Isi nama kelas, misalnya VII-A.", 400)
    existing = classes_of(db, teacher)
    if len(existing) >= MAX_CLASSES_PER_TEACHER:
        raise AppError("CLASS_LIMIT", f"Maksimal {MAX_CLASSES_PER_TEACHER} kelas per guru.", 400)
    if any(c.class_name == name for c in existing):
        raise AppError("CLASS_NAME_TAKEN", f"Anda sudah punya kelas {name}.", 409)
    created = SchoolClass(class_name=name, class_code=code or _unique_code(db), teacher_id=teacher.id)
    db.add(created)
    db.commit()
    return created


def student_counts(db: Session, codes: list[str]) -> dict[str, int]:
    if not codes:
        return {}
    stmt = (
        select(User.class_code, func.count())
        .where(User.role == ROLE_STUDENT, User.class_code.in_(codes))
        .group_by(User.class_code)
    )
    return {code: count for code, count in db.execute(stmt)}


def class_out(school_class: SchoolClass, student_count: int) -> dict:
    return {
        "id": school_class.id,
        "class_name": school_class.class_name,
        "class_code": school_class.class_code,
        "student_count": student_count,
        "created_at": school_class.created_at.isoformat(),
    }


def migrate_legacy_classes(db: Session) -> int:
    """Move accounts from the old free-text `kelas` into real classes. Safe to run on every start.

    Each teacher with a `kelas` gets one class of that name (new random code); students with the
    same `kelas` and no class yet join it. Returns the number of classes created.
    """
    created = 0
    teachers = db.scalars(select(User).where(User.role == ROLE_TEACHER, User.kelas.is_not(None)).order_by(User.id))
    for teacher in teachers:
        name = normalize_class_name(teacher.kelas or "")
        if not name:
            continue
        school_class = db.scalar(
            select(SchoolClass).where(SchoolClass.teacher_id == teacher.id, SchoolClass.class_name == name)
        )
        if school_class is None:
            school_class = SchoolClass(class_name=name, class_code=_unique_code(db), teacher_id=teacher.id)
            db.add(school_class)
            db.flush()
            created += 1
        students = db.scalars(
            select(User).where(
                User.role == ROLE_STUDENT, User.class_code.is_(None), func.upper(User.kelas) == name.replace(" ", "")
            )
        )
        for student in students:
            student.class_code = school_class.class_code
    db.commit()
    return created
