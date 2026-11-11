"""Semantic schema for story problems (docs/PEMODELAN-SOAL-CERITA.md §3)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

ProblemKind = Literal["story", "numeric", "represent"]
# "practice": daily lesson practice. "exam": Ujian Akhir only (new narratives and
# number ranges), never used in lessons or as a twin for practice problems.
TemplatePool = Literal["practice", "exam"]


class VarSpec(BaseModel):
    range: tuple[int, int]
    nonzero: bool = False
    step: int = 1
    fmt: str = "state"


class AskedSpec(BaseModel):
    options: list[str]
    correct: int = 0


class Template(BaseModel):
    id: str
    kind: ProblemKind
    schema_type: str
    unknown: str | None = None
    context: str
    level: int = 1
    pool: TemplatePool = "practice"
    text: str
    question: str | None = None
    vars: dict[str, VarSpec]
    derived: dict[str, str] = Field(default_factory=dict)
    derived_fmt: dict[str, str] = Field(default_factory=dict)
    constraints: list[str] = Field(default_factory=list)
    model: str
    forward_model: str | None = None
    given: list[str] = Field(default_factory=list)
    answer_fmt: str = "state"
    asked: AskedSpec | None = None
    labels: dict[str, str] = Field(default_factory=dict)
    # Literacy tag (docs/LITERASI-MATEMATIKA.md §4): indicators, process, cognitive_level, akm_context
    literacy: dict[str, str | list[str]] = Field(default_factory=dict)

    def fmt_of(self, name: str) -> str:
        if name in self.vars:
            return self.vars[name].fmt
        return self.derived_fmt.get(name, "state")


class Context(BaseModel):
    unit: str = ""
    visual: str = "number_line"
    range: tuple[int, int] = (-15, 15)
    step: int = 1
    thousands: bool = False
    fmt: dict[str, dict[str, str]]
    interpret: dict[str, dict[str, str]] = Field(default_factory=dict)
    interpret_alt: bool = True
    meaning: dict[str, str] = Field(default_factory=dict)


class GlossaryTerm(BaseModel):
    phrase: str
    sign: Literal["+", "-", "0"] | None = None
    explanation: str


class ExamStage(BaseModel):
    """One difficulty stage of the Ujian Akhir. Each slot yields one problem; the
    template is drawn (by seed) from the slot's alternatives."""

    key: str
    title: str
    level: int
    slots: list[list[str]] = Field(min_length=1)


class ExamConfig(BaseModel):
    id: str
    title: str
    stages: list[ExamStage] = Field(min_length=1)
