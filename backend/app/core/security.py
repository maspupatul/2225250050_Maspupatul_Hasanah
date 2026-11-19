"""Passwords, login tokens and role checks.

- Passwords/PINs: PBKDF2-HMAC-SHA256 with a random salt (standard library only);
  the plain text is never stored or logged.
- Tokens: JWT (HS256) signed with a server secret that is never committed.
- Roles: `require_role("guru")` / `require_role("siswa")` FastAPI dependencies.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
import time
from collections.abc import Callable
from datetime import UTC, datetime, timedelta

import jwt
from fastapi import Depends, Header
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.config import ON_VERCEL, settings
from app.core.errors import AppError
from app.db.database import SessionLocal, get_db
from app.db.models import LoginFailure, User

_ALGORITHM = "HS256"

# ------------------------------------------------------------------ passwords


def hash_password(password: str, iterations: int | None = None) -> str:
    iterations = iterations or settings.pbkdf2_iterations
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)
    return "pbkdf2_sha256${}${}${}".format(
        iterations, base64.b64encode(salt).decode(), base64.b64encode(digest).decode()
    )


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, iterations, salt_b64, digest_b64 = stored.split("$")
        if scheme != "pbkdf2_sha256":
            return False
        expected = base64.b64decode(digest_b64)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), base64.b64decode(salt_b64), int(iterations))
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(digest, expected)


# ------------------------------------------------------------------ tokens


def _secret() -> str:
    if settings.jwt_secret:
        return settings.jwt_secret
    if ON_VERCEL:  # every instance would make its own secret and reject the others' tokens
        raise RuntimeError("ZMATH_JWT_SECRET belum diisi di Environment Variables Vercel.")
    path = settings.data_dir / "jwt_secret"
    if not path.exists():
        settings.data_dir.mkdir(parents=True, exist_ok=True)
        path.write_text(secrets.token_urlsafe(48), encoding="utf-8")
    return path.read_text(encoding="utf-8").strip()


def create_token(user: User) -> str:
    now = datetime.now(UTC)
    payload = {"sub": str(user.id), "role": user.role, "iat": now, "exp": now + timedelta(days=settings.token_days)}
    return jwt.encode(payload, _secret(), algorithm=_ALGORITHM)


def _unauthorized() -> AppError:
    return AppError("UNAUTHORIZED", "Silakan masuk terlebih dahulu.", 401)


def current_user(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise _unauthorized()
    try:
        payload = jwt.decode(authorization[7:].strip(), _secret(), algorithms=[_ALGORITHM])
        user = db.get(User, int(payload["sub"]))
    except (jwt.PyJWTError, KeyError, ValueError):
        raise _unauthorized() from None
    if user is None or user.role != payload.get("role"):
        raise _unauthorized()
    return user


def require_role(role: str) -> Callable[..., User]:
    def dependency(user: User = Depends(current_user)) -> User:
        if user.role != role:
            raise AppError("FORBIDDEN", "Halaman ini bukan untuk akunmu.", 403)
        return user

    return dependency


# ------------------------------------------------------------------ login throttle

MAX_FAILURES = 5
WINDOW_SECONDS = 300
KEY_LENGTH = 120  # login_failures.key


def check_login_allowed(username: str) -> None:
    since = time.time() - WINDOW_SECONDS
    with SessionLocal() as db:
        count = db.scalar(
            select(func.count())
            .select_from(LoginFailure)
            .where(LoginFailure.key == username[:KEY_LENGTH], LoginFailure.at > since)
        )
    if (count or 0) >= MAX_FAILURES:
        raise AppError("TOO_MANY_ATTEMPTS", "Terlalu banyak percobaan. Tunggu 5 menit, lalu coba lagi.", 429)


def record_login_failure(username: str) -> None:
    now = time.time()
    with SessionLocal() as db:
        db.execute(delete(LoginFailure).where(LoginFailure.at < now - WINDOW_SECONDS))  # old rows, any key
        db.add(LoginFailure(key=username[:KEY_LENGTH], at=now))
        db.commit()


def clear_login_failures(username: str) -> None:
    with SessionLocal() as db:
        db.execute(delete(LoginFailure).where(LoginFailure.key == username[:KEY_LENGTH]))
        db.commit()
