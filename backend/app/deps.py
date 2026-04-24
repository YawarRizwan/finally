"""Shared FastAPI dependencies.

The price cache and market data source are created once at app startup and
stored on ``app.state``. These helpers let route handlers retrieve them via
``Depends`` without reaching into globals.
"""

from __future__ import annotations

from fastapi import Request

from app.market import MarketDataSource, PriceCache


def get_cache(request: Request) -> PriceCache:
    return request.app.state.price_cache


def get_source(request: Request) -> MarketDataSource:
    return request.app.state.market_source
