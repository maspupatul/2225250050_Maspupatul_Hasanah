"""Practice endpoints (docs/API-SPEC.md §3.10–3.12). No endpoint ever reveals an
answer before the student has found it (ADR-08)."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.errors import AppError
from app.core.security import current_user
from app.db.models import User
from app.services import ai_hint, assistant, attempts, exam
from app.services.classes import assistant_allowed

router = APIRouter(prefix="/practice", tags=["practice"])

StepKey = Literal["known", "asked", "model", "result", "interpret"]


class NextRequest(BaseModel):
    lesson_id: str | None = None
    template_id: str | None = None
    # Ujian Akhir: the exam seed from POST /exam/start and the problem number
    exam_seed: int | None = Field(default=None, ge=0, lt=exam.MAX_SEED)
    exam_index: int | None = Field(default=None, ge=0)
    guided: bool = True


class StepRequest(BaseModel):
    step: StepKey
    answer: int | str | list[int | str]


class HintRequest(BaseModel):
    step: StepKey


class ChatMessage(BaseModel):
    role: Literal["siswa", "asisten"]
    text: str = Field(min_length=1, max_length=assistant.MAX_TEXT)


class AssistantRequest(BaseModel):
    # the recent conversation, kept only on the device; the server stores none of it
    messages: list[ChatMessage] = Field(min_length=1, max_length=12)


@router.post("/next")
def next_problem(body: NextRequest) -> dict:
    if body.exam_seed is not None:
        return exam.start_exam_problem(
            exam_seed=body.exam_seed, index=body.exam_index or 0, guided=body.guided
        )
    return attempts.start_attempt(
        lesson_id=body.lesson_id, template_id=body.template_id, guided=body.guided
    )


@router.post("/attempts/{attempt_id}/steps")
def submit_step(attempt_id: str, body: StepRequest) -> dict:
    return attempts.submit_step(attempt_id, body.step, body.answer)


@router.post("/attempts/{attempt_id}/hint")
def hint(attempt_id: str, body: HintRequest) -> dict:
    return attempts.request_hint(attempt_id, body.step)


@router.post("/attempts/{attempt_id}/twin")
def twin(attempt_id: str) -> dict:
    return attempts.request_twin(attempt_id)


@router.get("/assistant")
def assistant_status(user: User = Depends(current_user)) -> dict:
    """Whether Tanya Asisten is on for this student (their teacher can switch it off)."""
    return {"enabled": assistant_allowed(user), "ai": ai_hint.available()}


@router.post("/attempts/{attempt_id}/assistant")
def ask_assistant(attempt_id: str, body: AssistantRequest, user: User = Depends(current_user)) -> dict:
    """Tanya Asisten: guidance for the active step, never the answer (DESAIN-PEDAGOGIS §0.7)."""
    if not assistant_allowed(user):
        raise AppError("ASSISTANT_OFF", "Asisten dimatikan oleh gurumu untuk kelas ini.", 403)
    messages = [assistant.Message(m.role, m.text) for m in body.messages]
    return assistant.reply(attempt_id, messages, private=[user.name, user.username])
