"""FinAlly database layer.

Owns all raw SQL, schema, seeding, and repository functions.
The backend engineer consumes the repository API re-exported here.
"""

from app.db.connection import DB_PATH, get_connection, init_db, reset_connection
from app.db.errors import DBError, InsufficientCashError, InsufficientSharesError
from app.db.repository import (
    add_watchlist,
    append_chat,
    apply_trade,
    get_position,
    get_positions,
    get_profile,
    history_snapshots,
    list_trades,
    list_watchlist,
    recent_chat,
    record_snapshot,
    remove_watchlist,
    update_cash,
)

__all__ = [
    "DB_PATH",
    "DBError",
    "InsufficientCashError",
    "InsufficientSharesError",
    "add_watchlist",
    "append_chat",
    "apply_trade",
    "get_connection",
    "get_position",
    "get_positions",
    "get_profile",
    "history_snapshots",
    "init_db",
    "list_trades",
    "list_watchlist",
    "recent_chat",
    "record_snapshot",
    "remove_watchlist",
    "reset_connection",
    "update_cash",
]
