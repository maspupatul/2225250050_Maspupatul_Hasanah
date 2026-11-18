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
    database_url: str = field(default_factory=lambda: os.getenv("ZMATH_DB_URL", ""))
    # Secret for signing login tokens. Empty = generated once and kept in data_dir (never committed).
    jwt_secret: str = field(default_factory=lambda: os.getenv("ZMATH_JWT_SECRET", ""))
    token_days: int = field(default_factory=lambda: int(os.getenv("ZMATH_TOKEN_DAYS", "7")))
    # Teachers can only self-register with this code. Empty = teacher sign-up is closed.
    teacher_signup_code: str = field(default_factory=lambda: os.getenv("ZMATH_TEACHER_CODE", ""))
    # Demo accounts (guru/guru123 + 3 students) for trying the app. Turn off in production.
    seed_demo: bool = field(default_factory=lambda: os.getenv("ZMATH_SEED_DEMO", "1") == "1")
    pbkdf2_iterations: int = field(default_factory=lambda: int(os.getenv("ZMATH_PBKDF2_ITERATIONS", "310000")))
    # ---- Smart Hint (Gemini). Off when the key is missing or ZMATH_AI_HINTS=0.
    gemini_api_key: str = field(default_factory=lambda: os.getenv("GEMINI_API_KEY", "").strip())
    ai_hints: bool = field(default_factory=lambda: os.getenv("ZMATH_AI_HINTS", "1") == "1")
    ai_timeout_ms: int = field(default_factory=lambda: int(os.getenv("ZMATH_AI_TIMEOUT_MS", "12000")))
    # Optional: force one model name, e.g. "gemini-2.5-flash". Empty = pick automatically.
    gemini_model: str = field(default_factory=lambda: os.getenv("GEMINI_MODEL", "").strip())

    def db_url(self) -> str:
        if self.database_url:
            return self.database_url
        self.data_dir.mkdir(parents=True, exist_ok=True)
        return f"sqlite:///{(self.data_dir / 'zmath.db').as_posix()}"


settings = Settings()
