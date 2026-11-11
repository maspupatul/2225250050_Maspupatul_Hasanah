"""Learning content endpoints (modules, lessons, glossary)."""

from __future__ import annotations

from fastapi import APIRouter

from app.content.loader import content
from app.core.errors import AppError

router = APIRouter(tags=["content"])


def _lesson_summary(lesson: dict) -> dict:
    return {
        "id": lesson["id"],
        "module_id": lesson["module_id"],
        "order": lesson["order"],
        # global number shown everywhere ("Pelajaran 5"): position on the home path
        "number": content().lesson_order().index(lesson["id"]) + 1,
        "title": lesson["title"],
        "subtitle": lesson["subtitle"],
        "icon": lesson["icon"],
        "segment_count": len(lesson["segments"]),
        "practice_count": lesson["practice"]["count"],
    }


@router.get("/modules")
def list_modules() -> list[dict]:
    c = content()
    return [
        {
            "id": module["id"],
            "title": module["title"],
            "order": module["order"],
            "lessons": [_lesson_summary(c.lessons[lid]) for lid in module["lessons"]],
        }
        for module in c.modules
    ]


@router.get("/lessons/{lesson_id}")
def get_lesson(lesson_id: str) -> dict:
    lesson = content().lessons.get(lesson_id)
    if lesson is None:
        raise AppError("NOT_FOUND", "Pelajaran tidak ditemukan.", 404)
    # Only lesson segments are returned; practice templates (with answers) stay on the server.
    return _lesson_summary(lesson) | {"segments": lesson["segments"]}


@router.get("/glossary")
def glossary() -> list[dict]:
    return [term.model_dump() for term in content().glossary]
