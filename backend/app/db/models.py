"""Tables for accounts and learning progress.

Only what the app needs is stored (docs/KEAMANAN-PRIVASI.md §2): a display name,
a username, a password hash, a role, an optional class code and learning progress.
No email, birth date, phone number or location for students.
"""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, true
from sqlalchemy.orm import Mapped, foreign, mapped_column, relationship

from app.db.database import Base

ROLE_STUDENT = "siswa"
ROLE_TEACHER = "guru"


def _now() -> datetime:
    return datetime.now(UTC)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(40))
    # stored lower-case; unique across both roles
    username: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(10), index=True)  # 'siswa' | 'guru'
    # LEGACY free-text class (e.g. "7A"). No longer used for access: it is only read once by
    # migrate_legacy_classes() to move old accounts into the `classes` table.
    kelas: Mapped[str | None] = mapped_column(String(20), index=True, nullable=True)
    # students: the class they joined (classes.class_code). Teachers see only students
    # whose code belongs to one of their own classes.
    class_code: Mapped[str | None] = mapped_column(String(6), index=True, nullable=True)
    parent_consent: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    progress: Mapped[StudentProgress | None] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    # plain column join (no DB foreign key: users and classes would reference each other)
    school_class: Mapped[SchoolClass | None] = relationship(
        primaryjoin=lambda: foreign(User.class_code) == SchoolClass.class_code, viewonly=True, lazy="joined"
    )


class SchoolClass(Base):
    """A class made by a teacher. Students join it with its 6-character code."""

    __tablename__ = "classes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    class_name: Mapped[str] = mapped_column(String(20))  # e.g. "VII-A"
    class_code: Mapped[str] = mapped_column(String(6), unique=True, index=True)  # e.g. "ZM7A92"
    teacher_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    # Tanya Asisten (AI chat) for students of this class; the teacher can switch it off.
    assistant_enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class StudentProgress(Base):
    """One row per student: the merged snapshot of the progress kept on the device."""

    __tablename__ = "student_progress"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    # {lesson_id: {"status": "in_progress"|"done", "segment": int, "mastery": 0..1}}
    lessons: Mapped[dict] = mapped_column(JSON, default=dict)
    correct: Mapped[int] = mapped_column(Integer, default=0)
    self_found: Mapped[int] = mapped_column(Integer, default=0)
    hints_used: Mapped[int] = mapped_column(Integer, default=0)
    deferred: Mapped[int] = mapped_column(Integer, default=0)
    exam_best: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # [{"score": 0..100, "date": "YYYY-MM-DD", "stages": {"dasar": 80, ...}}]
    exam_history: Mapped[list] = mapped_column(JSON, default=list)
    active_days: Mapped[list] = mapped_column(JSON, default=list)  # ["YYYY-MM-DD", ...]
    # problems waiting in Antrean Ulang: [{"templateId", "lessonId", "addedAt"}]
    review_queue: Mapped[list] = mapped_column(JSON, default=list)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    user: Mapped[User] = relationship(back_populates="progress")
