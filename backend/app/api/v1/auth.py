"""Login and registration for two roles: 'siswa' (student) and 'guru' (teacher)."""

from __future__ import annotations

import hmac

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import AppError
from app.core.security import (
    check_login_allowed,
    clear_login_failures,
    create_token,
    current_user,
    hash_password,
    record_login_failure,
    require_role,
    verify_password,
)
from app.db.database import get_db
from app.db.models import ROLE_STUDENT, ROLE_TEACHER, User
from app.schemas.account import JoinClassRequest, LoginRequest, RegisterRequest
from app.services.accounts import get_by_username, normalize_username, snapshot_of, user_out
from app.services.classes import require_class

router = APIRouter(prefix="/auth", tags=["auth"])

TEACHER_MIN_PASSWORD = 8


def _session(user: User) -> dict:
    body = {"token": create_token(user), "user": user_out(user)}
    if user.role == ROLE_STUDENT:
        body["progress"] = snapshot_of(user.progress)
    return body


@router.post("/register", status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)) -> dict:
    if body.role == ROLE_TEACHER:
        # teacher accounts are never open to everyone: they can see children's data
        if not settings.teacher_signup_code or not hmac.compare_digest(
            (body.teacher_code or "").encode(), settings.teacher_signup_code.encode()
        ):
            raise AppError("TEACHER_CODE_INVALID", "Kode pendaftaran guru tidak valid. Hubungi admin sekolah.", 403)
        if len(body.password) < TEACHER_MIN_PASSWORD:
            raise AppError("VALIDATION_ERROR", "Kata sandi guru minimal 8 karakter.", 400)
    elif not body.parent_consent:
        raise AppError("CONSENT_REQUIRED", "Minta izin orang tua atau wali dulu, lalu centang kotaknya.", 400)

    # students may join a class right away; the code must belong to a real class
    class_code = require_class(db, body.class_code).class_code if body.role == ROLE_STUDENT and body.class_code else None

    if get_by_username(db, body.username):
        raise AppError("USERNAME_TAKEN", "Nama pengguna ini sudah dipakai. Coba yang lain.", 409)
    user = User(
        name=body.name,
        username=normalize_username(body.username),
        password_hash=hash_password(body.password),
        role=body.role,
        class_code=class_code,
        parent_consent=body.parent_consent if body.role == ROLE_STUDENT else False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _session(user)


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)) -> dict:
    username = normalize_username(body.username)
    check_login_allowed(username)
    user = get_by_username(db, username)
    if user is None or not verify_password(body.password, user.password_hash):
        record_login_failure(username)
        # one message for both cases: do not reveal which usernames exist
        raise AppError("LOGIN_FAILED", "Nama pengguna atau PIN/kata sandi salah.", 401)
    if body.role and body.role != user.role:
        other = "guru" if user.role == ROLE_TEACHER else "siswa"
        raise AppError("WRONG_ROLE", f"Akun ini adalah akun {other}. Pilih 'Masuk sebagai {other.capitalize()}'.", 403)
    clear_login_failures(username)
    return _session(user)


@router.get("/me")
def me(user: User = Depends(current_user)) -> dict:
    return user_out(user)


@router.put("/me/class")
def join_class(
    body: JoinClassRequest, user: User = Depends(require_role(ROLE_STUDENT)), db: Session = Depends(get_db)
) -> dict:
    """Student enters or changes their class code later (Profil). null leaves the class."""
    if body.class_code is None:
        user.class_code = None
    else:
        # wrong codes are throttled like logins, so codes cannot be guessed by trying many
        key = f"class-code:{user.id}"
        check_login_allowed(key)
        try:
            user.class_code = require_class(db, body.class_code).class_code
        except AppError:
            record_login_failure(key)
            raise
        clear_login_failures(key)
    db.commit()
    db.refresh(user)
    return user_out(user)
