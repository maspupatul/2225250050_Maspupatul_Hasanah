"""Practice endpoints (docs/API-SPEC.md §3.10–3.12). No endpoint ever reveals an
answer before the student has found it (ADR-08)."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services import attempts, exam

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
