"""SQLite connection and lazy schema initialization.

A single process-wide connection is shared across threads. SQLite handles
serialization internally; every write happens inside a transaction so that
multi-statement operations (e.g., apply_trade) are atomic.
"""

from __future__ import annotations

import os
import sqlite3
import threading
from pathlib import Path

# In dev: backend/app/db/connection.py -> parents[3] = project root -> db/finally.db
# In container: /app/app/db/connection.py -> parents[3] = / (wrong)
# FINALLY_DB_PATH env var overrides both; the Dockerfile sets it to /app/db/finally.db.
_env_path = os.environ.get("FINALLY_DB_PATH")
if _env_path:
    DB_PATH = Path(_env_path)
else:
    _PROJECT_ROOT = Path(__file__).resolve().parents[3]
    DB_PATH = _PROJECT_ROOT / "db" / "finally.db"
_SCHEMA_PATH = Path(__file__).with_name("schema.sql")

_lock = threading.Lock()
_conn: sqlite3.Connection | None = None
_current_path: Path | None = None


def _create_connection(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(
        str(path),
        check_same_thread=False,
        detect_types=sqlite3.PARSE_DECLTYPES,
    )
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def get_connection(path: Path | None = None) -> sqlite3.Connection:
    """Return the process-wide connection, initializing schema and seeds on first call."""
    global _conn, _current_path
    target = Path(path) if path is not None else DB_PATH
    with _lock:
        if _conn is None or _current_path != target:
            _conn = _create_connection(target)
            _current_path = target
            _ensure_schema(_conn)
            # Lazy import to avoid a circular import with repository -> connection.
            from app.db.seed import seed_defaults

            seed_defaults(_conn)
        return _conn


def init_db(path: Path | None = None) -> sqlite3.Connection:
    """Explicit initializer; equivalent to get_connection()."""
    return get_connection(path)


def reset_connection() -> None:
    """Close and drop the cached connection. Intended for tests."""
    global _conn, _current_path
    with _lock:
        if _conn is not None:
            _conn.close()
        _conn = None
        _current_path = None


def _ensure_schema(conn: sqlite3.Connection) -> None:
    sql = _SCHEMA_PATH.read_text(encoding="utf-8")
    conn.executescript(sql)
