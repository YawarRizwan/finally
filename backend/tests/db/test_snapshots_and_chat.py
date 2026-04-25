"""Snapshot history, chat append/recent, profile cash update."""

from __future__ import annotations

from app.db.repository import (
    append_chat,
    history_snapshots,
    recent_chat,
    record_snapshot,
    update_cash,
    get_profile,
)


def test_record_and_history_snapshots(conn):
    record_snapshot(10500.0)
    record_snapshot(10750.0)
    history = history_snapshots()
    # Seed insert + two records.
    assert len(history) == 3
    assert history[-1]["total_value"] == 10750.0


def test_update_cash(conn):
    update_cash(5000.0)
    assert get_profile()["cash_balance"] == 5000.0


def test_append_and_recent_chat_roundtrip(conn):
    append_chat("user", "hello")
    append_chat("assistant", "hi", actions=[{"ticker": "AAPL", "status": "executed"}])
    messages = recent_chat(limit=10)
    assert len(messages) == 2
    assert messages[0]["content"] == "hello"
    assert messages[0]["actions"] is None
    assert messages[1]["role"] == "assistant"
    assert messages[1]["actions"] == [{"ticker": "AAPL", "status": "executed"}]


def test_recent_chat_limit_returns_last_n_in_order(conn):
    for i in range(5):
        append_chat("user", f"msg-{i}")
    messages = recent_chat(limit=3)
    assert [m["content"] for m in messages] == ["msg-2", "msg-3", "msg-4"]


def test_per_user_isolation(conn):
    append_chat("user", "alice-msg", user_id="alice")
    append_chat("user", "bob-msg", user_id="bob")
    alice = recent_chat(user_id="alice")
    bob = recent_chat(user_id="bob")
    assert [m["content"] for m in alice] == ["alice-msg"]
    assert [m["content"] for m in bob] == ["bob-msg"]
