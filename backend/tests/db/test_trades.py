"""Trade semantics: buy weighted avg, sell in place, sell-to-zero deletion, errors."""

from __future__ import annotations

import pytest

from app.db.errors import InsufficientCashError, InsufficientSharesError
from app.db.repository import (
    apply_trade,
    get_position,
    get_positions,
    get_profile,
    list_trades,
)


def test_buy_creates_position_and_deducts_cash(conn):
    trade = apply_trade("AAPL", "buy", 10, 100.0)
    assert trade["side"] == "buy"
    pos = get_position("AAPL")
    assert pos["quantity"] == 10
    assert pos["avg_cost"] == 100.0
    profile = get_profile()
    assert profile["cash_balance"] == 10000.0 - 1000.0


def test_buy_weighted_average_cost(conn):
    apply_trade("AAPL", "buy", 10, 100.0)
    apply_trade("AAPL", "buy", 10, 200.0)
    pos = get_position("AAPL")
    assert pos["quantity"] == 20
    # (10*100 + 10*200) / 20 = 150
    assert pos["avg_cost"] == pytest.approx(150.0)


def test_sell_partial_keeps_avg_cost(conn):
    apply_trade("AAPL", "buy", 10, 100.0)
    apply_trade("AAPL", "sell", 4, 200.0)
    pos = get_position("AAPL")
    assert pos["quantity"] == pytest.approx(6)
    assert pos["avg_cost"] == 100.0


def test_sell_to_zero_deletes_position(conn):
    apply_trade("AAPL", "buy", 5, 100.0)
    apply_trade("AAPL", "sell", 5, 200.0)
    assert get_position("AAPL") is None
    # Cash should be 10000 - 500 + 1000 = 10500
    assert get_profile()["cash_balance"] == pytest.approx(10500.0)


def test_sell_missing_position_raises(conn):
    with pytest.raises(InsufficientSharesError):
        apply_trade("AAPL", "sell", 1, 100.0)


def test_oversell_raises(conn):
    apply_trade("AAPL", "buy", 2, 100.0)
    with pytest.raises(InsufficientSharesError):
        apply_trade("AAPL", "sell", 3, 100.0)


def test_insufficient_cash_raises(conn):
    with pytest.raises(InsufficientCashError):
        apply_trade("AAPL", "buy", 1000, 1000.0)


def test_failed_trade_rolls_back(conn):
    cash_before = get_profile()["cash_balance"]
    with pytest.raises(InsufficientCashError):
        apply_trade("AAPL", "buy", 9999, 9999.0)
    assert get_profile()["cash_balance"] == cash_before
    assert list_trades() == []
    assert get_positions() == []


def test_failed_sell_rolls_back(conn):
    apply_trade("AAPL", "buy", 2, 100.0)
    cash_before = get_profile()["cash_balance"]
    pos_before = get_position("AAPL")
    with pytest.raises(InsufficientSharesError):
        apply_trade("AAPL", "sell", 3, 100.0)
    assert get_profile()["cash_balance"] == cash_before
    assert get_position("AAPL") == pos_before
    # Only the original buy trade is logged.
    assert len(list_trades()) == 1


def test_invalid_side_raises_value_error(conn):
    with pytest.raises(ValueError):
        apply_trade("AAPL", "hold", 1, 100.0)


def test_trades_are_logged(conn):
    apply_trade("AAPL", "buy", 1, 100.0)
    apply_trade("AAPL", "buy", 1, 110.0)
    trades = list_trades()
    assert len(trades) == 2
    assert [t["price"] for t in trades] == [100.0, 110.0]
