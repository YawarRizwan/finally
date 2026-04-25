"""Schema creation and seed idempotence."""

from __future__ import annotations

from pathlib import Path

from app.db.connection import get_connection, reset_connection
from app.db.seed import DEFAULT_CASH, DEFAULT_USER_ID, DEFAULT_WATCHLIST, seed_defaults


def _table_names(conn):
    rows = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).fetchall()
    return {r["name"] for r in rows}


def test_schema_creates_six_tables(conn):
    names = _table_names(conn)
    for expected in (
        "users_profile",
        "watchlist",
        "positions",
        "trades",
        "portfolio_snapshots",
        "chat_messages",
    ):
        assert expected in names


def test_seed_default_profile(conn):
    row = conn.execute(
        "SELECT id, cash_balance FROM users_profile WHERE id = ?",
        (DEFAULT_USER_ID,),
    ).fetchone()
    assert row is not None
    assert row["cash_balance"] == DEFAULT_CASH


def test_seed_default_watchlist(conn):
    rows = conn.execute(
        "SELECT ticker FROM watchlist WHERE user_id = ?",
        (DEFAULT_USER_ID,),
    ).fetchall()
    assert {r["ticker"] for r in rows} == set(DEFAULT_WATCHLIST)


def test_seed_initial_snapshot(conn):
    rows = conn.execute(
        "SELECT total_value FROM portfolio_snapshots WHERE user_id = ?",
        (DEFAULT_USER_ID,),
    ).fetchall()
    assert len(rows) == 1
    assert rows[0]["total_value"] == DEFAULT_CASH


def test_seed_is_idempotent(conn):
    seed_defaults(conn)
    seed_defaults(conn)
    watch = conn.execute(
        "SELECT COUNT(*) AS c FROM watchlist WHERE user_id = ?",
        (DEFAULT_USER_ID,),
    ).fetchone()
    snaps = conn.execute(
        "SELECT COUNT(*) AS c FROM portfolio_snapshots WHERE user_id = ?",
        (DEFAULT_USER_ID,),
    ).fetchone()
    profiles = conn.execute("SELECT COUNT(*) AS c FROM users_profile").fetchone()
    assert watch["c"] == len(DEFAULT_WATCHLIST)
    assert snaps["c"] == 1
    assert profiles["c"] == 1


def test_fresh_db_file_is_created(tmp_path: Path, monkeypatch):
    from app.db import connection as conn_mod

    target = tmp_path / "sub" / "finally.db"
    monkeypatch.setattr(conn_mod, "DB_PATH", target)
    reset_connection()
    try:
        assert not target.exists()
        get_connection(target)
        assert target.exists()
    finally:
        reset_connection()
