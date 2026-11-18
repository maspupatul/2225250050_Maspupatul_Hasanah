"""Test settings: a throw-away database and fast password hashing (set before the app imports)."""

import os
import tempfile

_data = tempfile.mkdtemp(prefix="zmath-test-")
os.environ.setdefault("ZMATH_DATA_DIR", _data)
os.environ.setdefault("ZMATH_PBKDF2_ITERATIONS", "1000")
os.environ.setdefault("ZMATH_TEACHER_CODE", "kode-guru-uji")
os.environ.setdefault("ZMATH_SEED_DEMO", "1")
# Tests never call Gemini; tests/test_ai_hint.py swaps in a fake generator.
os.environ["ZMATH_AI_HINTS"] = "0"
