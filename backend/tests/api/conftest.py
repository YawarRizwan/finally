"""API-layer test fixtures.

Each test gets an isolated SQLite DB under ``tmp_path``, a fresh PriceCache
pre-seeded with synthetic prices for the default watchlist, and a stub
MarketDataSource that records add/remove calls without touching the real
simulator or hitting the network. Routes exercise the full FastAPI stack
via ``TestClient`` (which properly triggers lifespan).
"""

from __future__ import annotations

import os
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.db import connection as conn_mod
from app.db.connection import reset_connection
from app.market import MarketDataSource, PriceCache


class StubSource(MarketDataSource):
    """MarketDataSource that records calls; no background work, no network."""

    def __init__(self, cache: PriceCache) -> None:
        self.cache = cache
        self.tickers: list[str] = []
        self.added: list[str] = []
        self.removed: list[str] = []
        self.started = False
        self.stopped = False

    async def start(self, tickers: list[str]) -> None:
        self.tickers = list(tickers)
        self.started = True
        # Seed deterministic prices so trade and valuation tests have data.
        for t in tickers:
            self.cache.update(t, 100.0, open_price=100.0)

    async def stop(self) -> None:
        self.stopped = True

    async def add_ticker(self, ticker: str) -> None:
        if ticker not in self.tickers:
            self.tickers.append(ticker)
        self.added.append(ticker)
        self.cache.update(ticker, 100.0, open_price=100.0)

    async def remove_ticker(self, ticker: str) -> None:
        if ticker in self.tickers:
            self.tickers.remove(ticker)
        self.removed.append(ticker)
        self.cache.remove(ticker)

    def get_tickers(self) -> list[str]:
        return list(self.tickers)


@pytest.fixture(autouse=True)
def _isolated_db(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    target = tmp_path / "finally.db"
    monkeypatch.setattr(conn_mod, "DB_PATH", target)
    reset_connection()
    yield target
    reset_connection()


@pytest.fixture(autouse=True)
def _mock_llm(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LLM_MOCK", "true")
    # Short snapshot interval so the task isn't a drag on tests; still long
    # enough that no background snapshot fires within a fast test run.
    monkeypatch.setenv("PORTFOLIO_SNAPSHOT_INTERVAL_SECONDS", "3600")


@pytest.fixture
def stub_source() -> StubSource:
    """A StubSource we can inspect after the test."""
    return StubSource(PriceCache())


@pytest.fixture
def test_app(monkeypatch: pytest.MonkeyPatch, stub_source: StubSource) -> FastAPI:
    """Build the app but substitute the market-data factory with our stub."""
    import app.main as main_mod

    def _factory(cache: PriceCache) -> MarketDataSource:
        # Adopt the caller-supplied cache so the app state and the stub share it.
        stub_source.cache = cache
        return stub_source

    monkeypatch.setattr(main_mod, "create_market_data_source", _factory)
    return main_mod.create_app()


@pytest.fixture
def client(test_app: FastAPI) -> TestClient:
    with TestClient(test_app) as c:
        yield c
