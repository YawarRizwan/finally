"""Portfolio routes: view, trade execution, history."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.db import (
    InsufficientCashError,
    InsufficientSharesError,
    apply_trade,
    history_snapshots,
    record_snapshot,
)
from app.deps import get_cache
from app.market import PriceCache
from app.portfolio import build_portfolio, compute_total_value
from app.schemas import TradeRequest

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


@router.get("")
async def get_portfolio(cache: PriceCache = Depends(get_cache)) -> dict[str, Any]:
    return build_portfolio(cache)


@router.post("/trade")
async def post_trade(
    body: TradeRequest,
    cache: PriceCache = Depends(get_cache),
) -> dict[str, Any]:
    ticker = body.ticker.upper()
    price = cache.get_price(ticker)
    if price is None:
        raise HTTPException(
            status_code=400,
            detail=f"no market price available for {ticker}",
        )

    try:
        trade = apply_trade(ticker, body.side, body.quantity, price)
    except InsufficientCashError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except InsufficientSharesError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Post-trade snapshot per PLAN.md §7.
    total_value = compute_total_value(cache)
    record_snapshot(total_value)

    return {
        "id": trade["id"],
        "ticker": trade["ticker"],
        "side": trade["side"],
        "quantity": trade["quantity"],
        "price": trade["price"],
        "notional": trade["quantity"] * trade["price"],
        "executed_at": trade["executed_at"],
        "status": "executed",
    }


@router.get("/history")
async def get_history() -> list[dict[str, Any]]:
    snaps = history_snapshots()
    return [
        {"recorded_at": s["recorded_at"], "total_value": s["total_value"]}
        for s in snaps
    ]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
