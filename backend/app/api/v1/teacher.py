"""Teacher monitoring dashboard and class management. Limited to the teacher's own classes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.content.loader import content
from app.core.errors import AppError
from app.core.security import require_role
from app.db.database import get_db
from app.db.models import ROLE_TEACHER, User
from app.schemas.account import AssistantSwitch, ClassCreate, ClassOut
from app.services.accounts import report_for, reset_student_password, students_of, teaches
from app.services.classes import (
    class_out,
    classes_of,
    create_class,
    normalize_class_code,
    set_assistant,
    student_counts,
)
from app.services.progress_report import KKM, class_report

router = APIRouter(prefix="/guru", tags=["guru"])

SUMMARY_FIELDS = (
    "id", "name", "username", "kelas", "class_code", "modules", "percent_done", "avg_mastery", "exam_best",
    "exam_attempts", "correct", "self_found", "hints_used", "deferred", "streak", "last_active", "status",
)


@router.get("/classes", response_model=list[ClassOut])
def list_classes(teacher: User = Depends(require_role(ROLE_TEACHER)), db: Session = Depends(get_db)) -> list[dict]:
    """The teacher's classes with the number of students who joined each one."""
    own = classes_of(db, teacher)
    counts = student_counts(db, [c.class_code for c in own])
    return [class_out(c, counts.get(c.class_code, 0)) for c in own]


@router.post("/classes", response_model=ClassOut, status_code=201)
def new_class(
    body: ClassCreate, teacher: User = Depends(require_role(ROLE_TEACHER)), db: Session = Depends(get_db)
) -> dict:
    """Create a class; the server picks a unique 6-character join code."""
    return class_out(create_class(db, teacher, body.class_name), 0)


@router.put("/classes/{class_code}/assistant", response_model=ClassOut)
def switch_assistant(
    class_code: str,
    body: AssistantSwitch,
    teacher: User = Depends(require_role(ROLE_TEACHER)),
    db: Session = Depends(get_db),
) -> dict:
    """Turn Tanya Asisten on or off for the students of one class."""
    school_class = set_assistant(db, teacher, class_code, body.enabled)
    return class_out(school_class, student_counts(db, [school_class.class_code]).get(school_class.class_code, 0))


@router.get("/students-summary")
def students_summary(
    class_code: str | None = Query(default=None, max_length=12),
    teacher: User = Depends(require_role(ROLE_TEACHER)),
    db: Session = Depends(get_db),
) -> dict:
    """Recap of all the teacher's classes, or of one class with `?class_code=ZM7A92`."""
    own = classes_of(db, teacher)
    code = normalize_class_code(class_code)
    selected = None
    if code:
        selected = next((c for c in own if c.class_code == code), None)
        if selected is None:
            raise AppError("NOT_FOUND", "Kelas tidak ditemukan di daftar kelas Anda.", 404)
    reports = [report_for(s) for s in students_of(db, teacher, [code] if code else None)]
    return {
        "kelas": selected.class_name if selected else None,
        "class_code": selected.class_code if selected else None,
        "class_count": len(own),
        "kkm": KKM,
        "modules": [{"id": m["id"], "title": m["title"]} for m in content().modules],
        "class": class_report(reports),
        "students": [{k: r[k] for k in SUMMARY_FIELDS} for r in reports],
    }


@router.get("/students/{student_id}")
def student_detail(
    student_id: int, teacher: User = Depends(require_role(ROLE_TEACHER)), db: Session = Depends(get_db)
) -> dict:
    student = db.get(User, student_id)
    if student is None or not teaches(db, teacher, student):
        raise AppError("NOT_FOUND", "Siswa tidak ditemukan di kelas Anda.", 404)
    return report_for(student)


@router.post("/students/{student_id}/reset-password")
def reset_password(
    student_id: int, teacher: User = Depends(require_role(ROLE_TEACHER)), db: Session = Depends(get_db)
) -> dict:
    """A forgotten student password: the server sets a temporary one and returns it once,
    so the teacher can tell the student. Only for students in the teacher's own classes."""
    student, temporary = reset_student_password(db, teacher, student_id)
    return {"username": student.username, "temporary_password": temporary}
