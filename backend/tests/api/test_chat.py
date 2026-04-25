"""Chat endpoints: history restore, happy path, trade rejection."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_chat_history_empty_initially(client: TestClient) -> None:
    r = client.get("/api/chat/history")
    assert r.status_code == 200
    assert r.json() == []


def test_chat_happy_path_executes_fixture_trade(client: TestClient) -> None:
    r = client.post("/api/chat", json={"message": "buy some apple"})
    assert r.status_code == 200
    body = r.json()
    assert body["message"] == "Bought 10 AAPL at $185.25."
    assert len(body["trades"]) == 1

    trade = body["trades"][0]
    assert trade["ticker"] == "AAPL"
    assert trade["side"] == "buy"
    assert trade["quantity"] == 10
    assert trade["status"] == "executed"
    # Price comes from the stub cache, not the fixture.
    assert trade["price"] == 100.0
    assert trade["notional"] == 1000.0
    assert trade["executed_at"] is not None
    assert trade["error"] is None

    # History should now have user + assistant messages.
    history = client.get("/api/chat/history").json()
    assert len(history) == 2
    assert history[0]["role"] == "user"
    assert history[1]["role"] == "assistant"
    assert history[1]["actions"]["trades"][0]["status"] == "executed"


def test_chat_persists_rejected_trade_in_actions(client: TestClient) -> None:
    """Drain cash so the fixture's buy fails; verify rejected trade is preserved."""
    # Buy $9999 worth of AAPL (99 shares at $100) via the trade endpoint first
    # so that the fixture's 10-share buy ($1000) exceeds remaining cash.
    client.post(
        "/api/portfolio/trade",
        json={"ticker": "AAPL", "side": "buy", "quantity": 99},
    )

    r = client.post("/api/chat", json={"message": "buy some apple"})
    assert r.status_code == 200
    body = r.json()
    assert len(body["trades"]) == 1

    trade = body["trades"][0]
    assert trade["status"] == "rejected"
    assert trade["price"] is None
    assert trade["notional"] is None
    assert trade["executed_at"] is None
    assert trade["error"] is not None

    # Trade stayed in the array and was persisted.
    history = client.get("/api/chat/history").json()
    actions = history[-1]["actions"]
    assert actions["trades"][0]["status"] == "rejected"


def test_chat_invalid_empty_message(client: TestClient) -> None:
    r = client.post("/api/chat", json={"message": ""})
    assert r.status_code == 422
