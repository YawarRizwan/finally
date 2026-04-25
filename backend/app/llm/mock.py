"""Deterministic mock mode.

Returns the pinned fixture response. The fixture is embedded here to avoid
file-path resolution issues across development and container environments.
The canonical fixture lives at test/fixtures/llm_mock_response.json — keep
both in sync if you change the mock.
"""

from __future__ import annotations

from .schema import LLMOutput, TradeIntent, WatchlistChange

# Pinned fixture — mirrors test/fixtures/llm_mock_response.json exactly.
_FIXTURE = {
    "message": "Bought 10 AAPL at $185.25.",
    "trades": [
        {
            "ticker": "AAPL",
            "side": "buy",
            "quantity": 10,
            "status": "executed",
            "price": 185.25,
            "notional": 1852.50,
            "executed_at": "2026-01-01T00:00:00.000Z",
            "error": None,
        }
    ],
    "watchlist_changes": [],
}


def mock_response() -> LLMOutput:
    """Return the pinned fixture reduced to the minimal LLMOutput shape."""
    trades = [
        TradeIntent(ticker=t["ticker"], side=t["side"], quantity=t["quantity"])
        for t in _FIXTURE.get("trades", [])
    ]
    changes = [
        WatchlistChange(ticker=c["ticker"], action=c["action"])
        for c in _FIXTURE.get("watchlist_changes", [])
    ]
    return LLMOutput(
        message=_FIXTURE["message"],
        trades=trades,
        watchlist_changes=changes,
    )
