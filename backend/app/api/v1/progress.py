"""Students' progress: pulled at login, pushed automatically while learning."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import require_role
from app.db.database import get_db
from app.db.models import ROLE_STUDENT, User
from app.schemas.account import ProgressSnapshot
from app.services.accounts import save_snapshot, snapshot_of

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("")
def get_progress(user: User = Depends(require_role(ROLE_STUDENT))) -> dict:
    return snapshot_of(user.progress)


@router.post("/sync")
def sync(
    body: ProgressSnapshot,
    user: User = Depends(require_role(ROLE_STUDENT)),
    db: Session = Depends(get_db),
) -> dict:
    """Merge the device snapshot into the stored one and return the merged result."""
    return save_snapshot(db, user, body.model_dump())
