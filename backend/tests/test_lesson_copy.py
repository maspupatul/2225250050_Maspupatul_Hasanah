"""Readability rules for lesson screens (CLAUDE.md §5.1 and §5.10)."""

import re

import pytest

from app.content.loader import content

MAX_WORDS_PER_SCREEN = 60
MAX_WORDS_PER_SENTENCE = 15
SEPARATORS = (" = ", " → ", " < ", " > ")

SEGMENTS = [
    (lesson_id, i, segment)
    for lesson_id, lesson in content().lessons.items()
    for i, segment in enumerate(lesson["segments"])
]


def words(text: str) -> list[str]:
    return re.findall(r"[A-Za-zÀ-ÿ]+(?:-[A-Za-zÀ-ÿ]+)*", re.sub(r"\*\*", "", text))


def sentences(text: str) -> list[str]:
    return [s for s in re.split(r"(?<=[.!?])\s+|\n\n", re.sub(r"\*\*", "", text)) if s.strip()]


@pytest.mark.parametrize("lesson_id,index,segment", SEGMENTS, ids=lambda v: str(v)[:12])
def test_screen_is_short(lesson_id, index, segment):
    prose = " ".join(segment.get(k, "") for k in ("text", "callout"))
    total = len(words(prose)) + sum(len(words(line)) for line in segment.get("lines", []))
    assert total <= MAX_WORDS_PER_SCREEN, (lesson_id, index, total)


@pytest.mark.parametrize("lesson_id,index,segment", SEGMENTS, ids=lambda v: str(v)[:12])
def test_sentences_are_short(lesson_id, index, segment):
    for key in ("text", "callout"):
        for sentence in sentences(segment.get(key, "")):
            assert len(words(sentence)) <= MAX_WORDS_PER_SENTENCE, (lesson_id, index, sentence)


def test_math_lines_are_aligned_rows():
    for lesson_id, index, segment in SEGMENTS:
        for line in segment.get("lines", []):
            assert any(sep in line for sep in SEPARATORS) or line.startswith("= "), (lesson_id, line)


def test_long_explanations_use_paragraphs_or_callouts():
    """A concept screen with a pattern table always ends with a highlighted conclusion."""
    for lesson_id, index, segment in SEGMENTS:
        if segment["type"] == "concept" and len(segment.get("lines", [])) >= 3:
            assert segment.get("callout"), (lesson_id, index)
