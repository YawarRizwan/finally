"""Tests for the context builder."""

from __future__ import annotations

from app.llm.context import HISTORY_LIMIT, build_messages, render_portfolio_block
from app.llm.prompt import SYSTEM_PROMPT


def _ctx(**overrides):
    base = {
        "cash": 10000.0,
        "positions": [],
        "watchlist": [],
        "total_value": 10000.0,
        "recent_messages": [],
    }
    base.update(overrides)
    return base


def test_portfolio_block_includes_cash_and_total():
    block = render_portfolio_block(_ctx(cash=1234.5, total_value=5678.9))
    assert "$1,234.50" in block
    assert "$5,678.90" in block


def test_portfolio_block_lists_positions():
    block = render_portfolio_block(
        _ctx(
            positions=[
                {
                    "ticker": "AAPL",
                    "quantity": 10,
                    "avg_cost": 180.0,
                    "price": 190.0,
                    "unrealized_pnl": 100.0,
                }
            ]
        )
    )
    assert "AAPL" in block
    assert "qty=10" in block
    assert "avg_cost=$180.0" in block


def test_portfolio_block_handles_empty_positions_and_watchlist():
    block = render_portfolio_block(_ctx())
    assert "(none)" in block
    assert "(empty)" in block


def test_build_messages_structure():
    messages = build_messages("hello", _ctx())
    assert messages[0] == {"role": "system", "content": SYSTEM_PROMPT}
    assert messages[1]["role"] == "system"
    assert "PORTFOLIO STATE" in messages[1]["content"]
    assert messages[-1] == {"role": "user", "content": "hello"}


def test_build_messages_includes_recent_history():
    recent = [
        {"role": "user", "content": "hi"},
        {"role": "assistant", "content": "hello"},
    ]
    messages = build_messages("next", _ctx(recent_messages=recent))
    # system, system, user, assistant, user
    assert len(messages) == 5
    assert messages[2] == {"role": "user", "content": "hi"}
    assert messages[3] == {"role": "assistant", "content": "hello"}
    assert messages[4] == {"role": "user", "content": "next"}


def test_build_messages_trims_history_to_limit():
    recent = [
        {"role": "user" if i % 2 == 0 else "assistant", "content": f"msg{i}"}
        for i in range(30)
    ]
    messages = build_messages("now", _ctx(recent_messages=recent))
    # 2 system + HISTORY_LIMIT history + 1 new user
    assert len(messages) == 2 + HISTORY_LIMIT + 1
    # First history message should be msg10 (last 20 of 0..29)
    assert messages[2]["content"] == "msg10"


def test_build_messages_skips_malformed_history_entries():
    recent = [
        {"role": "user", "content": "keep"},
        {"role": "system", "content": "drop"},
        {"role": "user", "content": 12345},
        {"role": "assistant", "content": "keep2"},
    ]
    messages = build_messages("now", _ctx(recent_messages=recent))
    contents = [m["content"] for m in messages if m["role"] != "system"]
    assert "keep" in contents
    assert "keep2" in contents
    assert "drop" not in contents
    assert 12345 not in contents
