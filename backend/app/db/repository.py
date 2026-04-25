"""Repository functions exposed to the backend engineer.

Every public function accepts ``user_id: str = "default"``; no query
hard-codes the literal. All writes that span multiple statements run inside
a single transaction via ``with conn:``.
"""

from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from typing import Any

from app.db.connection import get_connection
from app.db.errors import InsufficientCashError, InsufficientSharesError
from app.db.seed import DEFAULT_USER_ID

SIDE_BUY = "buy"
SIDE_SELL = "sell"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _conn() -> sqlite3.Connection:
    return get_connection()


def _row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    return dict(row) if row is not None else None


# ---------- profile ----------


def get_profile(user_id: str = DEFAULT_USER_ID) -> dict[str, Any] | None:
    row = _conn().execute(
        "SELECT id, cash_balance, created_at FROM users_profile WHERE id = ?",
        (user_id,),
    ).fetchone()
    return _row_to_dict(row)


def update_cash(new_balance: float, user_id: str = DEFAULT_USER_ID) -> None:
    conn = _conn()
    with conn:
        conn.execute(
            "UPDATE users_profile SET cash_balance = ? WHERE id = ?",
            (new_balance, user_id),
        )


# ---------- watchlist ----------


def list_watchlist(user_id: str = DEFAULT_USER_ID) -> list[dict[str, Any]]:
    rows = _conn().execute(
        "SELECT id, user_id, ticker, added_at FROM watchlist "
        "WHERE user_id = ? ORDER BY added_at ASC, ticker ASC",
        (user_id,),
    ).fetchall()
    return [dict(r) for r in rows]


def add_watchlist(ticker: str, user_id: str = DEFAULT_USER_ID) -> dict[str, Any] | None:
    """Insert a watchlist row. Returns the inserted row, or None if already present."""
    conn = _conn()
    new_id = str(uuid.uuid4())
    now = _now()
    with conn:
        cur = conn.execute(
            "INSERT OR IGNORE INTO watchlist (id, user_id, ticker, added_at) VALUES (?, ?, ?, ?)",
            (new_id, user_id, ticker, now),
        )
        if cur.rowcount == 0:
            return None
    return {"id": new_id, "user_id": user_id, "ticker": ticker, "added_at": now}


def remove_watchlist(ticker: str, user_id: str = DEFAULT_USER_ID) -> bool:
    """Delete a watchlist row. Returns True iff a row was removed."""
    conn = _conn()
    with conn:
        cur = conn.execute(
            "DELETE FROM watchlist WHERE user_id = ? AND ticker = ?",
            (user_id, ticker),
        )
    return cur.rowcount > 0


# ---------- positions ----------


def get_positions(user_id: str = DEFAULT_USER_ID) -> list[dict[str, Any]]:
    rows = _conn().execute(
        "SELECT id, user_id, ticker, quantity, avg_cost, updated_at FROM positions "
        "WHERE user_id = ? ORDER BY ticker ASC",
        (user_id,),
    ).fetchall()
    return [dict(r) for r in rows]


def get_position(ticker: str, user_id: str = DEFAULT_USER_ID) -> dict[str, Any] | None:
    row = _conn().execute(
        "SELECT id, user_id, ticker, quantity, avg_cost, updated_at FROM positions "
        "WHERE user_id = ? AND ticker = ?",
        (user_id, ticker),
    ).fetchone()
    return _row_to_dict(row)


# ---------- trades ----------


def list_trades(user_id: str = DEFAULT_USER_ID) -> list[dict[str, Any]]:
    rows = _conn().execute(
        "SELECT id, user_id, ticker, side, quantity, price, executed_at FROM trades "
        "WHERE user_id = ? ORDER BY executed_at ASC",
        (user_id,),
    ).fetchall()
    return [dict(r) for r in rows]


def apply_trade(
    ticker: str,
    side: str,
    quantity: float,
    price: float,
    user_id: str = DEFAULT_USER_ID,
) -> dict[str, Any]:
    """Execute a buy or sell atomically.

    Buy: weighted-average ``avg_cost`` update. Sell: decrement quantity in place,
    ``avg_cost`` unchanged; delete the row when quantity reaches exactly zero.
    Raises ``InsufficientCashError`` or ``InsufficientSharesError`` on validation
    failure; the transaction is rolled back in that case.

    Returns the inserted trade row as a dict.
    """
    if side not in (SIDE_BUY, SIDE_SELL):
        raise ValueError(f"invalid side: {side}")
    if quantity <= 0:
        raise ValueError(f"quantity must be positive, got {quantity}")
    if price <= 0:
        raise ValueError(f"price must be positive, got {price}")

    notional = quantity * price
    now = _now()
    trade_id = str(uuid.uuid4())
    conn = _conn()
    try:
        with conn:
            profile = conn.execute(
                "SELECT cash_balance FROM users_profile WHERE id = ?",
                (user_id,),
            ).fetchone()
            if profile is None:
                raise InsufficientCashError(f"no profile for user {user_id}")

            cash = float(profile["cash_balance"])
            position = conn.execute(
                "SELECT id, quantity, avg_cost FROM positions WHERE user_id = ? AND ticker = ?",
                (user_id, ticker),
            ).fetchone()

            if side == SIDE_BUY:
                if notional > cash:
                    raise InsufficientCashError(
                        f"need {notional:.2f}, have {cash:.2f}"
                    )
                new_cash = cash - notional
                if position is None:
                    conn.execute(
                        "INSERT INTO positions "
                        "(id, user_id, ticker, quantity, avg_cost, updated_at) "
                        "VALUES (?, ?, ?, ?, ?, ?)",
                        (str(uuid.uuid4()), user_id, ticker, quantity, price, now),
                    )
                else:
                    old_qty = float(position["quantity"])
                    old_avg = float(position["avg_cost"])
                    new_qty = old_qty + quantity
                    new_avg = (old_qty * old_avg + quantity * price) / new_qty
                    conn.execute(
                        "UPDATE positions SET quantity = ?, avg_cost = ?, updated_at = ? "
                        "WHERE id = ?",
                        (new_qty, new_avg, now, position["id"]),
                    )
            else:  # sell
                if position is None:
                    raise InsufficientSharesError(
                        f"no position in {ticker} to sell"
                    )
                held = float(position["quantity"])
                if quantity > held:
                    raise InsufficientSharesError(
                        f"need {quantity}, hold {held}"
                    )
                new_cash = cash + notional
                remaining = held - quantity
                if remaining == 0:
                    conn.execute(
                        "DELETE FROM positions WHERE id = ?",
                        (position["id"],),
                    )
                else:
                    conn.execute(
                        "UPDATE positions SET quantity = ?, updated_at = ? WHERE id = ?",
                        (remaining, now, position["id"]),
                    )

            conn.execute(
                "UPDATE users_profile SET cash_balance = ? WHERE id = ?",
                (new_cash, user_id),
            )
            conn.execute(
                "INSERT INTO trades "
                "(id, user_id, ticker, side, quantity, price, executed_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (trade_id, user_id, ticker, side, quantity, price, now),
            )
    except (InsufficientCashError, InsufficientSharesError):
        raise

    return {
        "id": trade_id,
        "user_id": user_id,
        "ticker": ticker,
        "side": side,
        "quantity": quantity,
        "price": price,
        "executed_at": now,
    }


# ---------- snapshots ----------


def record_snapshot(total_value: float, user_id: str = DEFAULT_USER_ID) -> dict[str, Any]:
    snap_id = str(uuid.uuid4())
    now = _now()
    conn = _conn()
    with conn:
        conn.execute(
            "INSERT INTO portfolio_snapshots (id, user_id, total_value, recorded_at) "
            "VALUES (?, ?, ?, ?)",
            (snap_id, user_id, total_value, now),
        )
    return {
        "id": snap_id,
        "user_id": user_id,
        "total_value": total_value,
        "recorded_at": now,
    }


def history_snapshots(user_id: str = DEFAULT_USER_ID) -> list[dict[str, Any]]:
    rows = _conn().execute(
        "SELECT id, user_id, total_value, recorded_at FROM portfolio_snapshots "
        "WHERE user_id = ? ORDER BY recorded_at ASC",
        (user_id,),
    ).fetchall()
    return [dict(r) for r in rows]


# ---------- chat ----------


def append_chat(
    role: str,
    content: str,
    actions: list[dict[str, Any]] | dict[str, Any] | None = None,
    user_id: str = DEFAULT_USER_ID,
) -> dict[str, Any]:
    if role not in ("user", "assistant"):
        raise ValueError(f"invalid role: {role}")
    msg_id = str(uuid.uuid4())
    now = _now()
    actions_json = json.dumps(actions) if actions is not None else None
    conn = _conn()
    with conn:
        conn.execute(
            "INSERT INTO chat_messages (id, user_id, role, content, actions, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (msg_id, user_id, role, content, actions_json, now),
        )
    return {
        "id": msg_id,
        "user_id": user_id,
        "role": role,
        "content": content,
        "actions": actions,
        "created_at": now,
    }


def recent_chat(limit: int = 20, user_id: str = DEFAULT_USER_ID) -> list[dict[str, Any]]:
    """Return the most recent ``limit`` messages in chronological order."""
    rows = _conn().execute(
        "SELECT id, user_id, role, content, actions, created_at FROM chat_messages "
        "WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?",
        (user_id, limit),
    ).fetchall()
    result = []
    for row in reversed(rows):
        item = dict(row)
        item["actions"] = json.loads(item["actions"]) if item["actions"] else None
        result.append(item)
    return result


def reset_to_defaults(user_id: str = DEFAULT_USER_ID) -> None:
    """Hard-reset a user back to the initial seeded state.

    Intended for E2E test teardown. Resets cash to $10,000, clears all
    positions, trades, chat messages, and portfolio snapshots, then
    restores the default 10-ticker watchlist.
    """
    from app.db.seed import DEFAULT_CASH, DEFAULT_WATCHLIST

    now = _now()
    conn = _conn()
    with conn:
        conn.execute(
            "UPDATE users_profile SET cash_balance = ? WHERE id = ?",
            (DEFAULT_CASH, user_id),
        )
        conn.execute("DELETE FROM positions WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM trades WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM chat_messages WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM portfolio_snapshots WHERE user_id = ?", (user_id,))
        conn.execute(
            "INSERT INTO portfolio_snapshots (id, user_id, total_value, recorded_at) "
            "VALUES (?, ?, ?, ?)",
            (str(uuid.uuid4()), user_id, DEFAULT_CASH, now),
        )
        conn.execute("DELETE FROM watchlist WHERE user_id = ?", (user_id,))
        for ticker in DEFAULT_WATCHLIST:
            conn.execute(
                "INSERT OR IGNORE INTO watchlist (id, user_id, ticker, added_at) "
                "VALUES (?, ?, ?, ?)",
                (str(uuid.uuid4()), user_id, ticker, now),
            )
