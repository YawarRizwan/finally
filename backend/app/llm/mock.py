"""Deterministic mock mode.

Reads the pinned fixture at `test/fixtures/llm_mock_response.json` and strips
the enrichment fields so the returned shape matches the minimal contract
that `chat()` promises.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from .schema import LLMOutput, TradeIntent, WatchlistChange

# backend/app/llm/mock.py -> project root -> test/fixtures/
_FIXTURE_PATH = (
    Path(__file__).resolve().parent.parent.parent.parent / "test" / "fixtures" / "llm_mock_response.json"
)


@lru_cache(maxsize=1)
def _load_fixture() -> dict:
    with _FIXTURE_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def mock_response() -> LLMOutput:
    """Return the pinned fixture reduced to the minimal LLMOutput shape."""
    data = _load_fixture()
    trades = [
        TradeIntent(ticker=t["ticker"], side=t["side"], quantity=t["quantity"])
        for t in data.get("trades", [])
    ]
    changes = [
        WatchlistChange(ticker=c["ticker"], action=c["action"])
        for c in data.get("watchlist_changes", [])
    ]
    return LLMOutput(
        message=data["message"],
        trades=trades,
        watchlist_changes=changes,
    )
