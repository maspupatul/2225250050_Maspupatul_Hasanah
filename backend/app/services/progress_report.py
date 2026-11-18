"""Progress merging and teacher reports. PURE functions (unit-tested in tests/test_progress_report.py).

Merging rule (a student may learn on several devices): never lose progress.
- a lesson that is done anywhere stays done; mastery and segment take the maximum;
- counters (correct, hints, ...) take the maximum (each device counts monotonically);
- exam attempts and active days are a union; the Antrean Ulang list is the device's latest.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

KKM = 70  # minimum exam score to count as "tuntas"
NEEDS_HELP_MASTERY = 0.6
NEEDS_HELP_DEFERRED = 3
MAX_EXAM_HISTORY = 50
MAX_ACTIVE_DAYS = 400

Snapshot = dict[str, Any]


def empty_snapshot() -> Snapshot:
    return {
        "lessons": {},
        "stats": {"correct": 0, "selfFound": 0, "hintsUsed": 0, "deferred": 0},
        "examResults": [],
        "activeDays": [],
        "reviewQueue": [],
    }


def merge_snapshots(stored: Snapshot, incoming: Snapshot, known_lessons: set[str]) -> Snapshot:
    lessons: dict[str, dict] = {k: dict(v) for k, v in stored.get("lessons", {}).items()}
    for lesson_id, new in incoming.get("lessons", {}).items():
        if lesson_id not in known_lessons:
            continue  # ignore ids that are not in the curriculum
        old = lessons.get(lesson_id)
        if old is None:
            lessons[lesson_id] = dict(new)
            continue
        lessons[lesson_id] = {
            "status": "done" if "done" in (old["status"], new["status"]) else "in_progress",
            "segment": max(old["segment"], new["segment"]),
            "mastery": max(old["mastery"], new["mastery"]),
        }

    stats = {
        key: max(stored.get("stats", {}).get(key, 0), incoming.get("stats", {}).get(key, 0))
        for key in ("correct", "selfFound", "hintsUsed", "deferred")
    }

    seen: dict[tuple, dict] = {}
    for result in [*stored.get("examResults", []), *incoming.get("examResults", [])]:
        seen.setdefault((result["date"], result["score"]), result)
    exams = sorted(seen.values(), key=lambda r: r["date"])[-MAX_EXAM_HISTORY:]

    days = sorted(set(stored.get("activeDays", [])) | set(incoming.get("activeDays", [])))[-MAX_ACTIVE_DAYS:]
    return {
        "lessons": lessons,
        "stats": stats,
        "examResults": exams,
        "activeDays": days,
        "reviewQueue": list(incoming.get("reviewQueue", stored.get("reviewQueue", []))),
    }


def streak(active_days: list[str], today: date) -> int:
    """Days in a row with learning, counted back from today (or yesterday)."""
    active = set(active_days)
    day = today if today.isoformat() in active else today - timedelta(days=1)
    count = 0
    while day.isoformat() in active:
        count += 1
        day -= timedelta(days=1)
    return count


def student_status(percent_done: int, exam_best: int | None, avg_mastery: float | None, stats: dict) -> str:
    """'tuntas' | 'perlu_bimbingan' | 'berproses' (badge on the teacher dashboard)."""
    if percent_done == 100 and exam_best is not None and exam_best >= KKM:
        return "tuntas"
    hints, correct = stats.get("hintsUsed", 0), stats.get("correct", 0)
    if (
        (avg_mastery is not None and avg_mastery < NEEDS_HELP_MASTERY)
        or stats.get("deferred", 0) >= NEEDS_HELP_DEFERRED
        or (correct + hints >= 5 and hints > correct)
    ):
        return "perlu_bimbingan"
    return "berproses"


def student_report(snapshot: Snapshot, modules: list[dict], lesson_info: dict[str, dict], today: date) -> dict:
    """Per-student numbers for the dashboard: per module (subbab) completion and mastery."""
    lessons = snapshot.get("lessons", {})
    module_rows = []
    all_ids: list[str] = []
    for module in modules:
        ids = module["lessons"]
        all_ids += ids
        done = [i for i in ids if lessons.get(i, {}).get("status") == "done"]
        module_rows.append(
            {
                "id": module["id"],
                "title": module["title"],
                "percent": round(100 * len(done) / len(ids)) if ids else 0,
                "mastery": round(100 * sum(lessons[i]["mastery"] for i in done) / len(done)) if done else None,
            }
        )
    done_all = [i for i in all_ids if lessons.get(i, {}).get("status") == "done"]
    percent_done = round(100 * len(done_all) / len(all_ids)) if all_ids else 0
    avg_mastery = sum(lessons[i]["mastery"] for i in done_all) / len(done_all) if done_all else None
    exams = snapshot.get("examResults", [])
    exam_best = max((e["score"] for e in exams), default=None)
    stats = snapshot.get("stats", {})

    weak = [
        {
            "id": i,
            "number": lesson_info[i]["number"],
            "title": lesson_info[i]["title"],
            "status": lessons.get(i, {}).get("status", "not_started"),
            "mastery": round(100 * lessons[i]["mastery"]) if i in lessons else 0,
        }
        for i in all_ids
        if i in lessons and (lessons[i]["status"] != "done" or lessons[i]["mastery"] < NEEDS_HELP_MASTERY)
    ]
    review = snapshot.get("reviewQueue", [])
    for item in review:  # problems the student could not solve yet point to weak lessons too
        lesson_id = item.get("lessonId")
        if lesson_id in lesson_info and all(w["id"] != lesson_id for w in weak):
            info = lesson_info[lesson_id]
            weak.append({"id": lesson_id, "number": info["number"], "title": info["title"],
                         "status": lessons.get(lesson_id, {}).get("status", "not_started"),
                         "mastery": round(100 * lessons.get(lesson_id, {}).get("mastery", 0))})
    weak.sort(key=lambda w: (w["mastery"], w["number"]))

    days = snapshot.get("activeDays", [])
    return {
        "modules": module_rows,
        "percent_done": percent_done,
        "avg_mastery": round(100 * avg_mastery) if avg_mastery is not None else None,
        "exam_best": exam_best,
        "exam_attempts": len(exams),
        "exam_history": exams,
        "correct": stats.get("correct", 0),
        "self_found": stats.get("selfFound", 0),
        "hints_used": stats.get("hintsUsed", 0),
        "deferred": stats.get("deferred", 0),
        "review_waiting": len(review),
        "active_days": len(days),
        "streak": streak(days, today),
        "last_active": days[-1] if days else None,
        "weak_lessons": weak,
        "status": student_status(percent_done, exam_best, avg_mastery, stats),
    }


def class_report(students: list[dict]) -> dict:
    exams = [s["exam_best"] for s in students if s["exam_best"] is not None]
    return {
        "total_students": len(students),
        "avg_exam_best": round(sum(exams) / len(exams)) if exams else None,
        "completion_rate": round(sum(s["percent_done"] for s in students) / len(students)) if students else 0,
        "students_tuntas": sum(s["status"] == "tuntas" for s in students),
        "students_need_help": sum(s["status"] == "perlu_bimbingan" for s in students),
    }
