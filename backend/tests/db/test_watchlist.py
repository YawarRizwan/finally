"""Watchlist repository: round-trip and UNIQUE(user_id, ticker)."""

from __future__ import annotations

from app.db.repository import add_watchlist, list_watchlist, remove_watchlist


def test_list_watchlist_contains_seed(conn):
    tickers = [row["ticker"] for row in list_watchlist()]
    assert "AAPL" in tickers
    assert len(tickers) == 10


def test_add_watchlist_roundtrip(conn):
    inserted = add_watchlist("PYPL")
    assert inserted is not None
    assert inserted["ticker"] == "PYPL"
    tickers = [row["ticker"] for row in list_watchlist()]
    assert "PYPL" in tickers


def test_add_watchlist_duplicate_is_noop(conn):
    first = add_watchlist("PYPL")
    second = add_watchlist("PYPL")
    assert first is not None
    assert second is None
    count = sum(1 for r in list_watchlist() if r["ticker"] == "PYPL")
    assert count == 1


def test_unique_constraint_per_user(conn):
    add_watchlist("PYPL", user_id="alice")
    add_watchlist("PYPL", user_id="bob")
    assert any(r["ticker"] == "PYPL" for r in list_watchlist(user_id="alice"))
    assert any(r["ticker"] == "PYPL" for r in list_watchlist(user_id="bob"))


def test_remove_watchlist(conn):
    add_watchlist("PYPL")
    assert remove_watchlist("PYPL") is True
    assert not any(r["ticker"] == "PYPL" for r in list_watchlist())


def test_remove_watchlist_missing_returns_false(conn):
    assert remove_watchlist("DOES_NOT_EXIST") is False
