"""Portfolio endpoints: GET, trade POST, history GET."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_initial_portfolio(client: TestClient) -> None:
    r = client.get("/api/portfolio")
    assert r.status_code == 200
    body = r.json()
    assert body["cash_balance"] == 10000.0
    assert body["positions"] == []
    assert body["total_value"] == 10000.0
    assert body["total_unrealized_pl"] == 0.0


def test_buy_updates_cash_and_positions(client: TestClient) -> None:
    r = client.post(
        "/api/portfolio/trade",
        json={"ticker": "AAPL", "side": "buy", "quantity": 5},
    )
    assert r.status_code == 200
    trade = r.json()
    assert trade["status"] == "executed"
    assert trade["ticker"] == "AAPL"
    assert trade["quantity"] == 5
    assert trade["price"] == 100.0
    assert trade["notional"] == 500.0
    assert trade["executed_at"]

    p = client.get("/api/portfolio").json()
    assert p["cash_balance"] == 9500.0
    assert len(p["positions"]) == 1
    pos = p["positions"][0]
    assert pos["ticker"] == "AAPL"
    assert pos["quantity"] == 5
    assert pos["avg_cost"] == 100.0
    assert pos["current_price"] == 100.0


def test_buy_rejected_when_insufficient_cash(client: TestClient) -> None:
    r = client.post(
        "/api/portfolio/trade",
        json={"ticker": "AAPL", "side": "buy", "quantity": 1000},
    )
    assert r.status_code == 400
    assert "detail" in r.json()


def test_sell_rejected_without_position(client: TestClient) -> None:
    r = client.post(
        "/api/portfolio/trade",
        json={"ticker": "AAPL", "side": "sell", "quantity": 1},
    )
    assert r.status_code == 400


def test_sell_more_than_owned(client: TestClient) -> None:
    client.post(
        "/api/portfolio/trade",
        json={"ticker": "AAPL", "side": "buy", "quantity": 1},
    )
    r = client.post(
        "/api/portfolio/trade",
        json={"ticker": "AAPL", "side": "sell", "quantity": 5},
    )
    assert r.status_code == 400


def test_sell_to_zero_removes_position(client: TestClient) -> None:
    client.post(
        "/api/portfolio/trade",
        json={"ticker": "AAPL", "side": "buy", "quantity": 3},
    )
    client.post(
        "/api/portfolio/trade",
        json={"ticker": "AAPL", "side": "sell", "quantity": 3},
    )
    p = client.get("/api/portfolio").json()
    assert p["positions"] == []


def test_trade_unknown_ticker_returns_400(client: TestClient) -> None:
    r = client.post(
        "/api/portfolio/trade",
        json={"ticker": "ZZZZ", "side": "buy", "quantity": 1},
    )
    assert r.status_code == 400


def test_trade_invalid_body(client: TestClient) -> None:
    r = client.post(
        "/api/portfolio/trade",
        json={"ticker": "AAPL", "side": "buy", "quantity": 0},
    )
    assert r.status_code == 422


def test_history_includes_initial_snapshot(client: TestClient) -> None:
    r = client.get("/api/portfolio/history")
    assert r.status_code == 200
    snaps = r.json()
    assert len(snaps) >= 1
    assert snaps[0]["total_value"] == 10000.0
    assert "recorded_at" in snaps[0]


def test_trade_records_snapshot(client: TestClient) -> None:
    before = len(client.get("/api/portfolio/history").json())
    client.post(
        "/api/portfolio/trade",
        json={"ticker": "AAPL", "side": "buy", "quantity": 1},
    )
    after = len(client.get("/api/portfolio/history").json())
    assert after == before + 1
