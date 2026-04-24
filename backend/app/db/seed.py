"""Idempotent seeding of the default user, watchlist, and initial snapshot."""

from __future__ import annotations

import sqlite3
import uuid
from datetime import datetime, timezone

DEFAULT_USER_ID = "default"
DEFAULT_CASH = 10000.0
DEFAULT_WATCHLIST = (
    "AAPL",
    "GOOGL",
    "MSFT",
    "AMZN",
    "TSLA",
    "NVDA",
    "META",
    "JPM",
    "V",
    "NFLX",
)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def seed_defaults(conn: sqlite3.Connection, user_id: str = DEFAULT_USER_ID) -> None:
    """Insert the default profile, watchlist, and initial snapshot when missing.

    Safe to call on every startup; uses INSERT OR IGNORE and an existence check
    for the snapshot so repeated calls produce no duplicate rows.
    """
    now = _now()
    with conn:
        conn.execute(
            "INSERT OR IGNORE INTO users_profile (id, cash_balance, created_at) VALUES (?, ?, ?)",
            (user_id, DEFAULT_CASH, now),
        )
        for ticker in DEFAULT_WATCHLIST:
            conn.execute(
                "INSERT OR IGNORE INTO watchlist (id, user_id, ticker, added_at) "
                "VALUES (?, ?, ?, ?)",
                (str(uuid.uuid4()), user_id, ticker, now),
            )
        row = conn.execute(
            "SELECT 1 FROM portfolio_snapshots WHERE user_id = ? LIMIT 1",
            (user_id,),
        ).fetchone()
        if row is None:
            conn.execute(
                "INSERT INTO portfolio_snapshots (id, user_id, total_value, recorded_at) "
                "VALUES (?, ?, ?, ?)",
                (str(uuid.uuid4()), user_id, DEFAULT_CASH, now),
            )
