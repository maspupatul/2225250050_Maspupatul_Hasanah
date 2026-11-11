"""Load learning content (JSON) once at startup."""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.services.modeling.schema import Context, ExamConfig, GlossaryTerm, Template

CONTENT_DIR = Path(__file__).resolve().parent


def _read(name: str) -> Any:
    return json.loads((CONTENT_DIR / name).read_text(encoding="utf-8"))


@dataclass(frozen=True)
class Content:
    modules: list[dict]
    lessons: dict[str, dict]
    templates: dict[str, Template]
    contexts: dict[str, Context]
    glossary: list[GlossaryTerm]
    exam: ExamConfig

    def lesson_order(self) -> list[str]:
        return [lesson_id for module in self.modules for lesson_id in module["lessons"]]


@lru_cache(maxsize=1)
def content() -> Content:
    templates = {t["id"]: Template.model_validate(t) for t in _read("templates.json")}
    contexts = {k: Context.model_validate(v) for k, v in _read("contexts.json").items()}
    lessons = {lesson["id"]: lesson for lesson in _read("lessons.json")}
    modules = _read("modules.json")
    glossary = [GlossaryTerm.model_validate(g) for g in _read("glossary.json")]
    exam = ExamConfig.model_validate(_read("exam.json"))

    for template in templates.values():
        if template.context not in contexts:
            raise ValueError(f"{template.id}: unknown context {template.context}")
    for lesson in lessons.values():
        for template_id in lesson.get("practice", {}).get("templates", []):
            if template_id not in templates:
                raise ValueError(f"{lesson['id']}: unknown template {template_id}")
            if templates[template_id].pool != "practice":
                raise ValueError(f"{lesson['id']}: exam template {template_id} used in practice")
    for module in modules:
        for lesson_id in module["lessons"]:
            if lesson_id not in lessons:
                raise ValueError(f"{module['id']}: unknown lesson {lesson_id}")
    levels = [stage.level for stage in exam.stages]
    if levels != sorted(levels):
        raise ValueError("exam stages must go from easy to hard")
    for stage in exam.stages:
        for slot in stage.slots:
            for template_id in slot:
                template = templates.get(template_id)
                if template is None or template.pool != "exam":
                    raise ValueError(f"exam {stage.key}: {template_id} is not an exam template")
    return Content(modules, lessons, templates, contexts, glossary, exam)
