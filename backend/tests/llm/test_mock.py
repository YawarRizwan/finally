"""Tests for mock mode determinism."""

from __future__ import annotations

import pytest

from app.llm import chat
from app.llm.schema import LLMOutput


@pytest.fixture
def mock_env(monkeypatch):
    monkeypatch.setenv("LLM_MOCK", "true")


async def test_mock_returns_llmoutput(mock_env):
    result = await chat("hi", {})
    assert isinstance(result, LLMOutput)


async def test_mock_is_deterministic(mock_env):
    a = await chat("first call", {})
    b = await chat("second call", {"cash": 999})
    assert a.model_dump() == b.model_dump()


async def test_mock_matches_pinned_fixture(mock_env):
    result = await chat("hi", {})
    assert result.message == "Bought 10 AAPL at $185.25."
    assert len(result.trades) == 1
    trade = result.trades[0]
    assert trade.ticker == "AAPL"
    assert trade.side == "buy"
    assert trade.quantity == 10
    assert result.watchlist_changes == []


async def test_mock_does_not_leak_enrichment_fields(mock_env):
    result = await chat("hi", {})
    trade_dump = result.trades[0].model_dump()
    assert set(trade_dump.keys()) == {"ticker", "side", "quantity"}


async def test_mock_does_not_call_network(mock_env, monkeypatch):
    def boom(*args, **kwargs):
        raise AssertionError("network call attempted in mock mode")

    monkeypatch.setattr("app.llm.client.call_model", boom)
    result = await chat("hi", {})
    assert result.message == "Bought 10 AAPL at $185.25."
