"""Ujian Akhir endpoints. Problems are then served by POST /practice/next with
`exam_seed` + `exam_index`, so the step/hint/twin flow is exactly the same."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services import exam

router = APIRouter(prefix="/exam", tags=["exam"])


class StartRequest(BaseModel):
    seed: int | None = Field(default=None, ge=0, lt=exam.MAX_SEED)


@router.get("")
def exam_info() -> dict:
    return exam.exam_info()


@router.post("/start")
def start(body: StartRequest | None = None) -> dict:
    return exam.start_exam(body.seed if body else None)
