"""Application settings read from environment variables."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[2]

try:  # backend/.env (never committed). Real environment variables always win.
    from dotenv import load_dotenv

    load_dotenv(BACKEND_DIR / ".env", override=False)
except ImportError:  # python-dotenv is optional; plain env vars still work
    pass


def _split(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


ON_VERCEL = bool(os.getenv("VERCEL"))  # set by Vercel on every deployment
PG_DRIVERS = {"psycopg", "pg8000"}


def _demo_default() -> str:
    shared_db = bool((os.getenv("DATABASE_URL") or os.getenv("ZMATH_DB_URL") or "").strip())
    return "0" if os.getenv("VERCEL") or shared_db else "1"


def normalize_db_url(url: str, driver: str = "psycopg") -> str:
    """Pure: Supabase/Heroku-style URLs (postgres://, postgresql://) → the SQLAlchemy driver URL.

    psycopg 3 is the production driver. pg8000 (pure Python) is only for machines that cannot
    load the psycopg binary (ZMATH_PG_DRIVER=pg8000). Other URLs (sqlite:///…) pass unchanged."""
    url = url.strip().strip('"').strip("'")
    if driver not in PG_DRIVERS:
        raise ValueError(f"ZMATH_PG_DRIVER must be one of {sorted(PG_DRIVERS)}")
    for prefix in ("postgres://", "postgresql://", "postgresql+psycopg://", "postgresql+pg8000://"):
        if url.startswith(prefix):
            return f"postgresql+{driver}://" + url[len(prefix):]
    return url


@dataclass(frozen=True)
class Settings:
    app_env: str = field(default_factory=lambda: os.getenv("APP_ENV", "development"))
    cors_origins: list[str] = field(
        default_factory=lambda: _split(
            os.getenv(
                "CORS_ORIGINS",
                "http://localhost:5173,http://localhost:4173,capacitor://localhost,https://localhost",
            )
        )
    )
    # Folder hasil build frontend. Jika ada, backend juga menyajikan aplikasi web (PWA).
    frontend_dist: Path = field(
        default_factory=lambda: Path(
            os.getenv("FRONTEND_DIST", str(BACKEND_DIR.parent / "frontend" / "dist"))
        )
    )
    # ---- accounts & progress (stage 1: local SQLite; see docs/AKUN-DAN-PEMANTAUAN.md)
    data_dir: Path = field(default_factory=lambda: Path(os.getenv("ZMATH_DATA_DIR", str(BACKEND_DIR / ".data"))))
    # PostgreSQL (Supabase): DATABASE_URL wins; ZMATH_DB_URL is the older name. Empty = SQLite.
    database_url: str = field(
        repr=False, default_factory=lambda: (os.getenv("DATABASE_URL") or os.getenv("ZMATH_DB_URL") or "").strip()
    )
    pg_driver: str = field(default_factory=lambda: os.getenv("ZMATH_PG_DRIVER", "psycopg").strip() or "psycopg")
    # Secret for signing login tokens. Empty = generated once and kept in data_dir (never committed).
    jwt_secret: str = field(repr=False, default_factory=lambda: os.getenv("ZMATH_JWT_SECRET", ""))
    token_days: int = field(default_factory=lambda: int(os.getenv("ZMATH_TOKEN_DAYS", "7")))
    # Teachers can only self-register with this code. Empty = teacher sign-up is closed.
    teacher_signup_code: str = field(repr=False, default_factory=lambda: os.getenv("ZMATH_TEACHER_CODE", ""))
    # Demo accounts (guru/guru123 + 3 students) for trying the app. Turn off in production.
    # Default on only for the local SQLite file: a shared database (DATABASE_URL, e.g. Supabase)
    # or Vercel never gets accounts with known passwords unless ZMATH_SEED_DEMO=1 is set on purpose.
    seed_demo: bool = field(default_factory=lambda: os.getenv("ZMATH_SEED_DEMO", _demo_default()) == "1")
    pbkdf2_iterations: int = field(default_factory=lambda: int(os.getenv("ZMATH_PBKDF2_ITERATIONS", "310000")))
    # ---- Smart Hint (Gemini). Off when the key is missing or ZMATH_AI_HINTS=0.
    gemini_api_key: str = field(repr=False, default_factory=lambda: os.getenv("GEMINI_API_KEY", "").strip())
    ai_hints: bool = field(default_factory=lambda: os.getenv("ZMATH_AI_HINTS", "1") == "1")
    ai_timeout_ms: int = field(default_factory=lambda: int(os.getenv("ZMATH_AI_TIMEOUT_MS", "12000")))
    # Tanya Asisten may wait longer than a hint: the chat shows "Asisten sedang berpikir…"
    assistant_timeout_ms: int = field(
        default_factory=lambda: int(os.getenv("ZMATH_ASSISTANT_TIMEOUT_MS", "20000"))
    )
    # Optional: force one model name, e.g. "gemini-2.5-flash". Empty = pick automatically.
    gemini_model: str = field(default_factory=lambda: os.getenv("GEMINI_MODEL", "").strip())

    def db_url(self) -> str:
        if self.database_url:
            return normalize_db_url(self.database_url, self.pg_driver)
        if ON_VERCEL:  # read-only disk, many instances: a local SQLite file cannot work there
            raise RuntimeError("DATABASE_URL belum diisi di Environment Variables Vercel (Supabase, port 6543).")
        self.data_dir.mkdir(parents=True, exist_ok=True)
        return f"sqlite:///{(self.data_dir / 'zmath.db').as_posix()}"


settings = Settings()
