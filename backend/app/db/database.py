"""SQLAlchemy engine and session.

Local: a SQLite file in backend/.data/. Deployed: PostgreSQL on Supabase through its pooler
(port 6543, transaction mode), set with DATABASE_URL (docs/DEPLOY.md).
"""

from __future__ import annotations

import logging
import ssl
from collections.abc import Iterator
from typing import Any

from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import ON_VERCEL, settings

LOCAL_HOSTS = {None, "", "localhost", "127.0.0.1", "::1"}
SERVERLESS_POOL_SIZE = 2
SERVERLESS_OVERFLOW = 3
POOL_RECYCLE_S = 300
log = logging.getLogger("zmath.db")


class Base(DeclarativeBase):
    pass


def engine_options(url: str, serverless: bool = False) -> dict[str, Any]:
    """Pure: create_engine() keyword arguments for a database URL."""
    if url.startswith("sqlite"):
        return {"connect_args": {"check_same_thread": False}}
    parsed = make_url(url)
    remote = parsed.host not in LOCAL_HOSTS
    connect_args: dict[str, Any] = {}
    if parsed.drivername == "postgresql+psycopg":
        # the Supabase transaction pooler cannot keep server-side prepared statements
        connect_args["prepare_threshold"] = None
        if remote and "sslmode" not in parsed.query:
            connect_args["sslmode"] = "require"
    elif parsed.drivername == "postgresql+pg8000" and remote:
        context = ssl.create_default_context()  # encrypted, like sslmode=require
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        connect_args["ssl_context"] = context
    options: dict[str, Any] = {"connect_args": connect_args, "pool_pre_ping": True}
    if serverless:
        # A Vercel instance serves many requests (Fluid compute): keep a few connections open
        # instead of a new TCP + TLS + login per query (NullPool cost ~4 round trips each time).
        # Small on purpose: the Supabase pooler (transaction mode) does the real pooling, and
        # recycled often so a connection frozen with an idle instance is not reused for long.
        options.update(pool_size=SERVERLESS_POOL_SIZE, max_overflow=SERVERLESS_OVERFLOW, pool_recycle=POOL_RECYCLE_S)
    return options


def _usable_driver(url: str) -> str:
    """psycopg is preferred; if this machine cannot load it (e.g. Windows Smart App Control
    blocks its DLL) and pg8000 is installed, use pg8000 instead of failing at start-up."""
    if not url.startswith("postgresql+psycopg://"):
        return url
    try:
        import psycopg  # noqa: F401
    except ImportError as exc:
        try:
            import pg8000  # noqa: F401
        except ImportError:
            raise exc from None
        log.warning("psycopg cannot be loaded here (%s); using pg8000 instead", str(exc).splitlines()[0])
        return "postgresql+pg8000://" + url[len("postgresql+psycopg://") :]
    return url


_url = _usable_driver(settings.db_url())
engine = create_engine(_url, **engine_options(_url, serverless=ON_VERCEL))

if _url.startswith("sqlite"):

    @event.listens_for(engine, "connect")
    def _sqlite_pragmas(dbapi_connection, _record) -> None:  # noqa: ANN001 - DB-API objects
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    """FastAPI dependency: one session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from app.db import models  # noqa: F401 - registers the tables

    Base.metadata.create_all(engine)
    _add_missing_columns()


def _add_missing_columns() -> None:
    """create_all() never alters an existing table: add columns introduced after a database was made."""
    columns = {c["name"] for c in inspect(engine).get_columns("users")}
    if "class_code" not in columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN class_code VARCHAR(6)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_users_class_code ON users (class_code)"))
    class_columns = {c["name"] for c in inspect(engine).get_columns("classes")}
    if "assistant_enabled" not in class_columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE classes ADD COLUMN assistant_enabled BOOLEAN NOT NULL DEFAULT TRUE"))
