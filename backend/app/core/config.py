"""Application settings read from environment variables."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[2]


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


settings = Settings()
