"""Watchlist endpoints with market-source coupling."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_initial_watchlist_has_ten_seeded(client: TestClient) -> None:
    r = client.get("/api/watchlist")
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 10
    tickers = {item["ticker"] for item in body}
    assert "AAPL" in tickers
    for item in body:
        assert item["price"] is not None  # StubSource seeds 100.0 on start()


def test_add_ticker_calls_source(client: TestClient, stub_source) -> None:
    r = client.post("/api/watchlist", json={"ticker": "PYPL"})
    assert r.status_code == 201
    assert r.json()["ticker"] == "PYPL"
    assert "PYPL" in stub_source.added


def test_add_duplicate_returns_409(client: TestClient) -> None:
    r = client.post("/api/watchlist", json={"ticker": "AAPL"})
    assert r.status_code == 409


def test_add_lowercase_is_uppercased(client: TestClient) -> None:
    r = client.post("/api/watchlist", json={"ticker": "pypl"})
    assert r.status_code == 201
    assert r.json()["ticker"] == "PYPL"


def test_remove_existing_ticker(client: TestClient, stub_source) -> None:
    r = client.delete("/api/watchlist/META")
    assert r.status_code == 200
    assert r.json() == {"ticker": "META", "status": "removed"}
    assert "META" in stub_source.removed


def test_remove_missing_ticker_returns_404(client: TestClient) -> None:
    r = client.delete("/api/watchlist/NOPE")
    assert r.status_code == 404


def test_watchlist_shape_includes_price_fields(client: TestClient) -> None:
    item = client.get("/api/watchlist").json()[0]
    for key in ("ticker", "price", "prev_price", "open_price", "direction", "timestamp"):
        assert key in item
