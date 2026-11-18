"""Request/response models for accounts, progress sync and the teacher dashboard."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

Role = Literal["siswa", "guru"]
# letters, digits and . _ - @ (teachers may use their e-mail address as username)
USERNAME_PATTERN = r"^[A-Za-z0-9._@-]{3,60}$"


class RegisterRequest(BaseModel):
    role: Role
    name: str = Field(min_length=2, max_length=40)
    username: str = Field(pattern=USERNAME_PATTERN)
    password: str = Field(min_length=6, max_length=64)
    # students: optional join code of a class made by a teacher, e.g. "ZM7A92"
    class_code: str | None = Field(default=None, max_length=12)
    # students: parent/guardian permission (UU PDP, docs/KEAMANAN-PRIVASI.md §3)
    parent_consent: bool = False
    # teachers: sign-up code given by the school/admin
    teacher_code: str | None = Field(default=None, max_length=64)

    @field_validator("name", "class_code")
    @classmethod
    def _strip(cls, value: str | None) -> str | None:
        value = value.strip() if value else value
        return value or None


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=60)
    password: str = Field(min_length=1, max_length=64)
    role: Role | None = None


class UserOut(BaseModel):
    id: int
    name: str
    username: str
    role: Role
    kelas: str | None  # class name, e.g. "VII-A"
    class_code: str | None


class JoinClassRequest(BaseModel):
    """Student enters or changes their class code (Profil). null leaves the class."""

    class_code: str | None = Field(default=None, max_length=12)


# ------------------------------------------------------------------ classes (teacher)


class ClassCreate(BaseModel):
    class_name: str = Field(min_length=1, max_length=20)

    @field_validator("class_name")
    @classmethod
    def _name(cls, value: str) -> str:
        # an all-space name becomes "" and is rejected with a friendly message by create_class()
        return " ".join(value.split())


class ClassOut(BaseModel):
    id: int
    class_name: str
    class_code: str
    student_count: int
    created_at: str


# ------------------------------------------------------------------ progress snapshot


class LessonProgressIn(BaseModel):
    status: Literal["in_progress", "done"]
    segment: int = Field(ge=0, le=100)
    mastery: float = Field(ge=0, le=1)


class StatsIn(BaseModel):
    correct: int = Field(ge=0, le=1_000_000)
    selfFound: int = Field(ge=0, le=1_000_000)
    hintsUsed: int = Field(ge=0, le=1_000_000)
    deferred: int = Field(ge=0, le=1_000_000)


class ExamResultIn(BaseModel):
    score: int = Field(ge=0, le=100)
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    stages: dict[str, int] | None = None


class ReviewItemIn(BaseModel):
    templateId: str = Field(max_length=60)
    lessonId: str = Field(max_length=60)
    addedAt: str = Field(max_length=20)


class ProgressSnapshot(BaseModel):
    """What the device sends: the student's progress store (frontend/src/store/progress.ts)."""

    lessons: dict[str, LessonProgressIn] = Field(default_factory=dict, max_length=200)
    stats: StatsIn = Field(default_factory=lambda: StatsIn(correct=0, selfFound=0, hintsUsed=0, deferred=0))
    examResults: list[ExamResultIn] = Field(default_factory=list, max_length=100)
    activeDays: list[str] = Field(default_factory=list, max_length=500)
    reviewQueue: list[ReviewItemIn] = Field(default_factory=list, max_length=200)

    @field_validator("activeDays")
    @classmethod
    def _dates(cls, days: list[str]) -> list[str]:
        return [d for d in days if len(d) == 10 and d[4] == "-" and d[7] == "-"]
