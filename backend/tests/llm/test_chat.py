"""Tests for the public chat() entry point: valid parse and malformed handling."""

from __future__ import annotations

import pytest

from app.llm import MalformedLLMResponseError, chat
from app.llm.schema import LLMOutput


@pytest.fixture(autouse=True)
def _no_mock(monkeypatch):
    """Ensure LLM_MOCK is off for these tests so chat() hits the client path."""
    monkeypatch.delenv("LLM_MOCK", raising=False)


def _ctx():
    return {
        "cash": 10000.0,
        "positions": [],
        "watchlist": [],
        "total_value": 10000.0,
        "recent_messages": [],
    }


async def test_parses_valid_structured_output(monkeypatch):
    payload = (
        '{"message": "Done.",'
        ' "trades": [{"ticker": "AAPL", "side": "buy", "quantity": 5}],'
        ' "watchlist_changes": [{"ticker": "MSFT", "action": "add"}]}'
    )
    monkeypatch.setattr("app.llm.client.call_model", lambda messages: payload)

    result = await chat("buy 5 aapl", _ctx())

    assert isinstance(result, LLMOutput)
    assert result.message == "Done."
    assert len(result.trades) == 1
    assert result.trades[0].ticker == "AAPL"
    assert result.trades[0].side == "buy"
    assert result.trades[0].quantity == 5
    assert len(result.watchlist_changes) == 1
    assert result.watchlist_changes[0].ticker == "MSFT"
    assert result.watchlist_changes[0].action == "add"


async def test_parses_minimal_payload_with_empty_lists(monkeypatch):
    payload = '{"message": "Hi there."}'
    monkeypatch.setattr("app.llm.client.call_model", lambda messages: payload)

    result = await chat("hi", _ctx())

    assert result.message == "Hi there."
    assert result.trades == []
    assert result.watchlist_changes == []


async def test_malformed_json_raises_typed_error(monkeypatch):
    payload = "this is not json {"
    monkeypatch.setattr("app.llm.client.call_model", lambda messages: payload)

    with pytest.raises(MalformedLLMResponseError) as exc:
        await chat("hi", _ctx())
    assert exc.value.raw_content == payload


async def test_schema_mismatch_raises_typed_error(monkeypatch):
    # `message` is required; `side` must be buy/sell
    payload = '{"trades": [{"ticker": "AAPL", "side": "hold", "quantity": 5}]}'
    monkeypatch.setattr("app.llm.client.call_model", lambda messages: payload)

    with pytest.raises(MalformedLLMResponseError) as exc:
        await chat("hi", _ctx())
    assert exc.value.raw_content == payload


async def test_negative_quantity_raises_typed_error(monkeypatch):
    payload = (
        '{"message": "ok",'
        ' "trades": [{"ticker": "AAPL", "side": "buy", "quantity": -1}]}'
    )
    monkeypatch.setattr("app.llm.client.call_model", lambda messages: payload)

    with pytest.raises(MalformedLLMResponseError):
        await chat("hi", _ctx())


async def test_none_content_raises_typed_error(monkeypatch):
    monkeypatch.setattr("app.llm.client.call_model", lambda messages: None)

    with pytest.raises(MalformedLLMResponseError):
        await chat("hi", _ctx())


async def test_chat_passes_full_messages_to_client(monkeypatch):
    captured: dict = {}

    def fake(messages):
        captured["messages"] = messages
        return '{"message": "ok"}'

    monkeypatch.setattr("app.llm.client.call_model", fake)

    await chat("what should I buy?", _ctx())

    messages = captured["messages"]
    assert messages[0]["role"] == "system"
    assert messages[1]["role"] == "system"
    assert "PORTFOLIO STATE" in messages[1]["content"]
    assert messages[-1] == {"role": "user", "content": "what should I buy?"}
