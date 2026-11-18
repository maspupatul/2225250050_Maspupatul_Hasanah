"""Pure progress logic: merging devices, streaks, status badges, reports."""

from datetime import date

from app.services.progress_report import (
    class_report,
    empty_snapshot,
    merge_snapshots,
    streak,
    student_report,
    student_status,
)

MODULES = [
    {"id": "m1", "title": "Tambah", "lessons": ["a", "b"]},
    {"id": "m2", "title": "Kali", "lessons": ["c"]},
]
INFO = {"a": {"number": 1, "title": "A"}, "b": {"number": 2, "title": "B"}, "c": {"number": 3, "title": "C"}}


def test_merge_never_loses_progress():
    stored = empty_snapshot() | {"lessons": {"a": {"status": "done", "segment": 1, "mastery": 0.9}}}
    incoming = empty_snapshot() | {
        "lessons": {"a": {"status": "in_progress", "segment": 4, "mastery": 0.2},
                    "x": {"status": "done", "segment": 0, "mastery": 1}},
        "activeDays": ["2026-11-02", "2026-11-01"],
        "examResults": [{"score": 70, "date": "2026-11-02"}, {"score": 70, "date": "2026-11-02"}],
    }
    merged = merge_snapshots(stored, incoming, known_lessons={"a", "b", "c"})
    assert merged["lessons"] == {"a": {"status": "done", "segment": 4, "mastery": 0.9}}
    assert merged["activeDays"] == ["2026-11-01", "2026-11-02"]
    assert len(merged["examResults"]) == 1


def test_streak_counts_back_from_today_or_yesterday():
    today = date(2026, 11, 16)
    assert streak(["2026-11-14", "2026-11-15", "2026-11-16"], today) == 3
    assert streak(["2026-11-14", "2026-11-15"], today) == 2
    assert streak(["2026-11-10"], today) == 0


def test_status_badges():
    assert student_status(100, 75, 0.9, {}) == "tuntas"
    assert student_status(100, 60, 0.9, {}) == "berproses"  # below KKM
    assert student_status(40, None, 0.5, {}) == "perlu_bimbingan"  # low mastery
    assert student_status(40, None, 0.8, {"deferred": 3}) == "perlu_bimbingan"
    assert student_status(40, None, 0.8, {"correct": 2, "hintsUsed": 6}) == "perlu_bimbingan"
    assert student_status(40, None, 0.8, {"correct": 8, "hintsUsed": 3}) == "berproses"


def test_student_and_class_report():
    snap = empty_snapshot() | {
        "lessons": {"a": {"status": "done", "segment": 0, "mastery": 1.0},
                    "b": {"status": "done", "segment": 0, "mastery": 0.5}},
        "examResults": [{"score": 64, "date": "2026-11-15"}],
        "reviewQueue": [{"templateId": "t", "lessonId": "c", "addedAt": "2026-11-15"}],
        "activeDays": ["2026-11-15", "2026-11-16"],
    }
    r = student_report(snap, MODULES, INFO, date(2026, 11, 16))
    assert [m["percent"] for m in r["modules"]] == [100, 0]
    assert r["modules"][0]["mastery"] == 75 and r["modules"][1]["mastery"] is None
    assert r["percent_done"] == 67 and r["exam_best"] == 64 and r["streak"] == 2
    assert [w["id"] for w in r["weak_lessons"]] == ["c", "b"]  # weakest first
    cls = class_report([r, r | {"exam_best": None, "percent_done": 33, "status": "perlu_bimbingan"}])
    assert cls == {"total_students": 2, "avg_exam_best": 64, "completion_rate": 50,
                   "students_tuntas": 0, "students_need_help": 1}
