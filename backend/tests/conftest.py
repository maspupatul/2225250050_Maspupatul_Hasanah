"""Test settings: a throw-away database and fast password hashing (set before the app imports)."""

import os
import tempfile

_data = tempfile.mkdtemp(prefix="zmath-test-")
os.environ.setdefault("ZMATH_DATA_DIR", _data)
# Never the real database from backend/.env: a throw-away SQLite file, unless a separate
# PostgreSQL test database is given on purpose (docs/DEPLOY.md, "Menguji dengan PostgreSQL").
_test_db = os.environ.get("ZMATH_TEST_DATABASE_URL", "")
os.environ["DATABASE_URL"] = _test_db
os.environ["ZMATH_DB_URL"] = _test_db
os.environ.pop("VERCEL", None)
if not _test_db:
    os.environ.pop("ZMATH_PG_DRIVER", None)  # SQLite run: the driver setting does not apply
os.environ["GEMINI_API_KEY"] = ""  # never the real key from backend/.env (tests fake Gemini)
os.environ.setdefault("ZMATH_PBKDF2_ITERATIONS", "1000")
os.environ.setdefault("ZMATH_TEACHER_CODE", "kode-guru-uji")
os.environ.setdefault("ZMATH_SEED_DEMO", "1")
# Tests never call Gemini; tests/test_ai_hint.py swaps in a fake generator.
os.environ["ZMATH_AI_HINTS"] = "0"
