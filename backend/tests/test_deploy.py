"""Deployment (docs/DEPLOY.md): Supabase PostgreSQL URL handling, serverless guards, and the
state that used to live in server memory (practice attempts, login throttle) now in the DB."""

import secrets
import ssl

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.content.loader import content
from app.core import config, security
from app.core.config import Settings, normalize_db_url
from app.db.database import SessionLocal, engine_options
from app.db.models import LoginFailure, PracticeAttempt
from app.main import app
from app.services import attempts

client = TestClient(app)
API = "/api/v1"
SUPABASE = "postgresql://postgres.abcd:rahasia@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"


# ------------------------------------------------------------------ database URL


@pytest.mark.parametrize(
    "url",
    [
        SUPABASE,
        SUPABASE.replace("postgresql://", "postgres://"),
        SUPABASE.replace("postgresql://", "postgresql+psycopg://"),
        f'  "{SUPABASE}"  ',  # pasted with quotes and spaces
    ],
)
def test_supabase_url_becomes_psycopg_url(url):
    assert normalize_db_url(url) == SUPABASE.replace("postgresql://", "postgresql+psycopg://")


def test_pg8000_driver_and_sqlite_untouched():
    assert normalize_db_url(SUPABASE, "pg8000").startswith("postgresql+pg8000://postgres.abcd:")
    assert normalize_db_url("sqlite:///x.db") == "sqlite:///x.db"
    with pytest.raises(ValueError):
        normalize_db_url(SUPABASE, "mysql")


def test_database_url_wins_over_old_name(monkeypatch):
    monkeypatch.delenv("ZMATH_PG_DRIVER", raising=False)  # default driver (the PG test run sets pg8000)
    monkeypatch.setenv("DATABASE_URL", SUPABASE)
    monkeypatch.setenv("ZMATH_DB_URL", "sqlite:///lama.db")
    assert Settings().db_url().startswith("postgresql+psycopg://postgres.abcd:")


def test_psycopg_options_for_supabase_pooler():
    options = engine_options(normalize_db_url(SUPABASE))
    assert options["connect_args"] == {"prepare_threshold": None, "sslmode": "require"}
    assert options["pool_pre_ping"] is True and "poolclass" not in options
    serverless = engine_options(normalize_db_url(SUPABASE), serverless=True)
    # a small reused pool on Vercel: no new TLS login per query, recycled before it goes stale
    assert serverless["pool_size"] <= 2 and serverless["max_overflow"] <= 3
    assert serverless["pool_recycle"] <= 300 and serverless["pool_pre_ping"] is True
    explicit = engine_options(normalize_db_url(SUPABASE + "?sslmode=verify-full"))
    assert "sslmode" not in explicit["connect_args"]  # the URL's own choice is kept
    local = engine_options("postgresql+psycopg://u:p@localhost:5432/zmath")
    assert local["connect_args"] == {"prepare_threshold": None}  # no TLS needed on this machine


def test_pg8000_options_encrypt_remote_connections():
    options = engine_options(normalize_db_url(SUPABASE, "pg8000"))
    assert isinstance(options["connect_args"]["ssl_context"], ssl.SSLContext)


# ------------------------------------------------------------------ Vercel guards


def test_vercel_requires_database_url(monkeypatch):
    monkeypatch.setattr(config, "ON_VERCEL", True)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("ZMATH_DB_URL", raising=False)
    with pytest.raises(RuntimeError, match="DATABASE_URL"):
        Settings().db_url()


def test_vercel_requires_jwt_secret(monkeypatch):
    monkeypatch.setattr(security, "ON_VERCEL", True)
    monkeypatch.delenv("ZMATH_JWT_SECRET", raising=False)
    monkeypatch.setattr(security, "settings", Settings())
    with pytest.raises(RuntimeError, match="ZMATH_JWT_SECRET"):
        security._secret()


def test_demo_accounts_off_by_default_on_vercel(monkeypatch):
    monkeypatch.delenv("ZMATH_SEED_DEMO", raising=False)
    monkeypatch.setenv("VERCEL", "1")
    assert Settings().seed_demo is False
    monkeypatch.setenv("ZMATH_SEED_DEMO", "1")  # still possible on purpose
    assert Settings().seed_demo is True


def test_demo_accounts_off_by_default_with_shared_database(monkeypatch):
    monkeypatch.delenv("ZMATH_SEED_DEMO", raising=False)
    monkeypatch.delenv("VERCEL", raising=False)
    monkeypatch.setenv("DATABASE_URL", SUPABASE)  # e.g. the laptop pointed at Supabase
    assert Settings().seed_demo is False
    monkeypatch.setenv("DATABASE_URL", "")
    monkeypatch.setenv("ZMATH_DB_URL", "")
    assert Settings().seed_demo is True  # local SQLite: demo accounts as before


# ------------------------------------------------------------------ attempts in the database

STORY = next(t.id for t in content().templates.values() if t.kind == "story")


def test_attempt_round_trips_through_the_database():
    payload = attempts.start_attempt(lesson_id=None, template_id=STORY, guided=True, seed=42)
    attempt = attempts.get_attempt(payload["attempt_id"])
    attempt.current = 2
    attempt.state("model").hint_level = 2
    attempt.assistant_turns = 3
    attempts._save(attempt)

    attempts._instance.cache_clear()  # as on a fresh server instance
    again = attempts.get_attempt(attempt.id)
    assert attempts.attempt_data(again) == attempts.attempt_data(attempt)
    assert again.instance.answer == attempt.instance.answer and again.instance.values == attempt.instance.values


def test_progress_survives_between_requests():
    problem = client.post(f"{API}/practice/next", json={"template_id": STORY, "guided": True}).json()
    aid = problem["attempt_id"]
    givens = sorted(attempts.get_attempt(aid).instance.givens.values())
    res = client.post(f"{API}/practice/attempts/{aid}/steps", json={"step": "known", "answer": givens}).json()
    assert res["correct"] and res["next_step"] == "asked"
    with SessionLocal() as db:
        row = db.get(PracticeAttempt, aid)
        assert row.data["current"] == 1 and row.template_id == STORY
        assert "answer" not in row.data  # rebuilt from template + seed, never stored


def test_unknown_attempt_is_404():
    res = client.post(f"{API}/practice/attempts/tidak-ada/hint", json={"step": "result"})
    assert res.status_code == 404 and res.json()["error"]["code"] == "ATTEMPT_NOT_FOUND"


def test_old_attempts_are_cleaned_up():
    payload = attempts.start_attempt(lesson_id=None, template_id=STORY, guided=True, seed=7)
    with SessionLocal() as db:
        db.get(PracticeAttempt, payload["attempt_id"]).updated_at -= attempts.ATTEMPT_TTL_S + 60
        db.commit()
    attempts._last_cleanup = 0.0  # due now (normally at most every CLEANUP_EVERY_S)
    attempts.start_attempt(lesson_id=None, template_id=STORY, guided=True, seed=8)  # triggers clean-up
    with SessionLocal() as db:
        assert db.get(PracticeAttempt, payload["attempt_id"]) is None


# ------------------------------------------------------------------ login throttle in the database


def test_cleanup_runs_at_most_every_few_minutes():
    attempts._last_cleanup = 0.0
    assert attempts._cleanup_due(1_000_000.0) is True
    assert attempts._cleanup_due(1_000_000.0 + attempts.CLEANUP_EVERY_S - 1) is False
    assert attempts._cleanup_due(1_000_000.0 + attempts.CLEANUP_EVERY_S) is True
    attempts._last_cleanup = 0.0


def test_vercel_runs_next_to_the_database():
    """The functions run in Singapore (sin1), the region of the Supabase database."""
    import json
    from pathlib import Path

    vercel = json.loads((Path(__file__).resolve().parents[1] / "vercel.json").read_text("utf-8"))
    assert vercel["regions"] == ["sin1"]


def test_login_throttle_is_shared_through_the_database():
    key = f"uji-{secrets.token_hex(4)}"
    for _ in range(security.MAX_FAILURES):
        security.check_login_allowed(key)
        security.record_login_failure(key)
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(LoginFailure).where(LoginFailure.key == key)) == 5
    with pytest.raises(Exception, match="Terlalu banyak percobaan"):
        security.check_login_allowed(key)
    security.clear_login_failures(key)
    security.check_login_allowed(key)  # unlocked again


def test_old_failures_do_not_count(monkeypatch):
    key = f"uji-{secrets.token_hex(4)}"
    for _ in range(security.MAX_FAILURES):
        security.record_login_failure(key)
    real_time = security.time.time
    monkeypatch.setattr(security.time, "time", lambda: real_time() + security.WINDOW_SECONDS + 1)
    security.check_login_allowed(key)  # the window has passed


def test_pyproject_lists_every_runtime_package():
    """Vercel installs from pyproject.toml, not requirements.txt: a missing package = 500 on start."""
    import tomllib
    from pathlib import Path

    backend = Path(__file__).resolve().parents[1]
    declared = set(tomllib.loads((backend / "pyproject.toml").read_text("utf-8"))["project"]["dependencies"])
    test_only = {"pytest", "httpx"}
    lines = (backend / "requirements.txt").read_text("utf-8").splitlines()
    runtime = {ln.strip() for ln in lines if ln.strip() and not ln.startswith("#")}
    runtime = {pkg for pkg in runtime if pkg.split("==")[0] not in test_only}
    assert declared == runtime


def test_settings_never_print_secrets(monkeypatch):
    """A failing test or a log line must not show keys or passwords (repr of Settings)."""
    monkeypatch.setenv("GEMINI_API_KEY", "AQ-kunci-rahasia-uji")
    monkeypatch.setenv("ZMATH_JWT_SECRET", "jwt-rahasia-uji")
    monkeypatch.setenv("ZMATH_TEACHER_CODE", "kode-rahasia-uji")
    monkeypatch.setenv("DATABASE_URL", SUPABASE)
    shown = repr(Settings())
    for secret in ("kunci-rahasia-uji", "jwt-rahasia-uji", "kode-rahasia-uji", "rahasia@"):
        assert secret not in shown
