"""Z-Math API.

Run (from backend/):  uvicorn app.main:app --reload
If frontend/dist exists (after `npm run build`), the same server also serves the
installable web app (PWA), so one URL is enough for students.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from app.api.v1 import api_router
from app.content.loader import content
from app.core.config import settings
from app.core.errors import install_error_handlers
from app.db.database import SessionLocal, init_db
from app.services import ai_hint
from app.services.accounts import seed_demo
from app.services.classes import migrate_legacy_classes

app = FastAPI(title="Z-Math API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["*"],
)
install_error_handlers(app)
app.include_router(api_router, prefix="/api/v1")

content()  # validate content files at startup

# accounts & progress database (stage 1: local SQLite in backend/.data/)
init_db()
with SessionLocal() as _db:
    migrate_legacy_classes(_db)  # old free-text `kelas` → classes with join codes (idempotent)
    if settings.seed_demo:
        seed_demo(_db)

# Smart Hint: list Gemini models in the background (never delays or breaks startup)
ai_hint.warm_up_in_background()


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


_dist = settings.frontend_dist.resolve()
if (_dist / "index.html").is_file():

    @app.get("/{path:path}", include_in_schema=False)
    def frontend(path: str):  # noqa: ANN201 - returns a file or JSON error
        if path.startswith("api/"):
            return JSONResponse(
                status_code=404,
                content={"error": {"code": "NOT_FOUND", "message": "Tidak ditemukan.", "details": None}},
            )
        candidate = (_dist / path).resolve()
        if path and candidate.is_file() and _dist in candidate.parents:
            headers = {"Cache-Control": "no-cache"} if candidate.name in {"sw.js", "index.html"} else None
            return FileResponse(candidate, headers=headers)
        return FileResponse(_dist / "index.html", headers={"Cache-Control": "no-cache"})
