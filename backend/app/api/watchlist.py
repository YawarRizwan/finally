"""Watchlist routes: list, add, remove — with market-source sync."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.db import add_watchlist, list_watchlist, remove_watchlist
from app.deps import get_cache, get_source
from app.market import MarketDataSource, PriceCache
from app.schemas import WatchlistAddRequest

router = APIRouter(prefix="/api/watchlist", tags=["watchlist"])


def _merge_with_cache(ticker: str, cache: PriceCache) -> dict[str, Any]:
    update = cache.get(ticker)
    if update is None:
        return {
            "ticker": ticker,
            "price": None,
            "prev_price": None,
            "open_price": None,
            "direction": None,
            "timestamp": None,
        }
    ts_iso = (
        datetime.fromtimestamp(update.timestamp, tz=timezone.utc)
        .isoformat()
        .replace("+00:00", "Z")
    )
    return {
        "ticker": ticker,
        "price": update.price,
        "prev_price": update.prev_price,
        "open_price": update.open_price,
        "direction": update.direction,
        "timestamp": ts_iso,
    }


@router.get("")
async def get_watchlist(cache: PriceCache = Depends(get_cache)) -> list[dict[str, Any]]:
    rows = list_watchlist()
    return [_merge_with_cache(r["ticker"], cache) for r in rows]


@router.post("", status_code=201)
async def post_watchlist(
    body: WatchlistAddRequest,
    source: MarketDataSource = Depends(get_source),
    cache: PriceCache = Depends(get_cache),
) -> dict[str, Any]:
    ticker = body.ticker.upper()
    row = add_watchlist(ticker)
    if row is None:
        raise HTTPException(status_code=409, detail=f"{ticker} already in watchlist")
    await source.add_ticker(ticker)
    return _merge_with_cache(ticker, cache)


@router.delete("/{ticker}")
async def delete_watchlist(
    ticker: str,
    source: MarketDataSource = Depends(get_source),
) -> dict[str, str]:
    upper = ticker.upper()
    removed = remove_watchlist(upper)
    if not removed:
        raise HTTPException(status_code=404, detail=f"{upper} not in watchlist")
    await source.remove_ticker(upper)
    return {"ticker": upper, "status": "removed"}
