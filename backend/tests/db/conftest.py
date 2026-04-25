"""Test fixtures: every test gets an isolated SQLite file under tmp_path."""

from __future__ import annotations

from pathlib import Path

import pytest

from app.db import connection as conn_mod
from app.db.connection import get_connection, reset_connection


@pytest.fixture
def db_path(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Point DB_PATH at a tmp file and reset the cached connection after the test."""
    target = tmp_path / "finally.db"
    monkeypatch.setattr(conn_mod, "DB_PATH", target)
    reset_connection()
    yield target
    reset_connection()


@pytest.fixture
def conn(db_path: Path):
    """A fully-initialized connection with seeds applied."""
    return get_connection(db_path)
