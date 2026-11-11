"""Ujian Akhir (final exam): a summary evaluation of every topic, easy to hard.

The exam plan is a PURE function of a seed (CLAUDE.md §6), so the server keeps no
exam state: the client sends `(exam_seed, exam_index)` and the same seed always
yields the same twelve problems. Problems come only from templates in the
`exam` pool, which have their own narratives and wider number ranges, so they are
never identical to the daily lesson practice (see tests/test_exam.py).

Pedagogy is unchanged inside the exam (docs/DESAIN-PEDAGOGIS.md §6): no answer is
ever revealed, hints and Soal Kembar stay available, and the score uses the same
mastery weights (help lowers the score, it never blocks the student).
"""

from __future__ import annotations

import random
from dataclasses import dataclass

from app.content.loader import content
from app.core.errors import AppError
from app.services.attempts import start_attempt
from app.services.modeling.schema import ExamConfig

MAX_SEED = 2**31


@dataclass(frozen=True)
class ExamItem:
    index: int
    stage: str
    stage_title: str
    stage_number: int
    level: int
    template_id: str
    seed: int

    def public(self) -> dict:
        """What the client may see (no template id, no instance seed)."""
        return {
            "index": self.index,
            "stage": self.stage,
            "stage_title": self.stage_title,
            "stage_number": self.stage_number,
            "level": self.level,
        }


def build_plan(config: ExamConfig, seed: int) -> list[ExamItem]:
    """Deterministic exam plan: stages in order (Dasar → Menengah → HOTS), one
    problem per slot, the template picked among the slot's alternatives."""
    rng = random.Random(seed)
    items: list[ExamItem] = []
    for number, stage in enumerate(config.stages, start=1):
        for slot in stage.slots:
            items.append(
                ExamItem(
                    index=len(items),
                    stage=stage.key,
                    stage_title=stage.title,
                    stage_number=number,
                    level=stage.level,
                    template_id=rng.choice(slot),
                    seed=rng.randrange(MAX_SEED),
                )
            )
    return items


def exam_info() -> dict:
    config = content().exam
    return {
        "id": config.id,
        "title": config.title,
        "total": sum(len(stage.slots) for stage in config.stages),
        "stages": [
            {"key": s.key, "title": s.title, "level": s.level, "count": len(s.slots)}
            for s in config.stages
        ],
    }


def start_exam(seed: int | None = None) -> dict:
    seed = random.SystemRandom().randrange(MAX_SEED) if seed is None else seed
    plan = build_plan(content().exam, seed)
    return exam_info() | {"seed": seed, "items": [item.public() for item in plan]}


def start_exam_problem(*, exam_seed: int, index: int, guided: bool) -> dict:
    plan = build_plan(content().exam, exam_seed)
    if not 0 <= index < len(plan):
        raise AppError("NOT_FOUND", "Soal ujian tidak ditemukan.", 404)
    item = plan[index]
    payload = start_attempt(
        lesson_id=None, template_id=item.template_id, guided=guided, seed=item.seed
    )
    return payload | {"exam": item.public() | {"total": len(plan)}}
