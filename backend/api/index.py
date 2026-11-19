"""Vercel entrypoint: the FastAPI app as one Python (ASGI) function (docs/DEPLOY.md).

vercel.json sends every path here; FastAPI then routes /api/v1/... as usual. Start-up work
(content check, creating/upgrading tables, migrations) runs once per function instance, when
app.main is imported. Required environment variables on Vercel: DATABASE_URL, ZMATH_JWT_SECRET.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # backend/ → import `app`

from app.main import app  # noqa: E402

__all__ = ["app"]
