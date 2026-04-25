"""Chat routes: history + send message (LLM → execute → enrich → persist)."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.db import (
    InsufficientCashError,
    InsufficientSharesError,
    add_watchlist,
    append_chat,
    apply_trade,
    recent_chat,
    record_snapshot,
    remove_watchlist,
)
from app.deps import get_cache, get_source
from app.llm import MalformedLLMResponseError, chat
from app.market import MarketDataSource, PriceCache
from app.portfolio import build_portfolio, compute_total_value
from app.schemas import ChatRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.get("/history")
async def get_history() -> list[dict[str, Any]]:
    rows = recent_chat(limit=20)
    return [
        {
            "role": r["role"],
            "content": r["content"],
            "actions": r["actions"],
            "created_at": r["created_at"],
        }
        for r in rows
    ]


def _build_context(cache: PriceCache) -> dict[str, Any]:
    portfolio = build_portfolio(cache)
    watchlist_rows = [
        {
            "ticker": t,
            "price": (u.price if u else None),
            "change_percent": (u.change_percent if u else None),
        }
        for t, u in (
            (r["ticker"], cache.get(r["ticker"]))
            for r in _list_watchlist_names()
        )
    ]
    return {
        "cash": portfolio["cash_balance"],
        "positions": portfolio["positions"],
        "watchlist": watchlist_rows,
        "total_value": portfolio["total_value"],
        "recent_messages": recent_chat(limit=20),
    }


def _list_watchlist_names() -> list[dict[str, Any]]:
    from app.db import list_watchlist

    return list_watchlist()


def _execute_trade(intent: dict[str, Any], cache: PriceCache) -> dict[str, Any]:
    """Attempt to execute a single LLM-proposed trade. Returns enriched dict."""
    ticker = intent["ticker"].upper()
    side = intent["side"]
    qty = float(intent["quantity"])
    base = {
        "ticker": ticker,
        "side": side,
        "quantity": qty,
        "status": "rejected",
        "price": None,
        "notional": None,
        "executed_at": None,
        "error": None,
    }

    price = cache.get_price(ticker)
    if price is None:
        base["error"] = f"no market price available for {ticker}"
        return base

    try:
        trade = apply_trade(ticker, side, qty, price)
    except (InsufficientCashError, InsufficientSharesError, ValueError) as e:
        base["error"] = str(e)
        return base

    base.update(
        status="executed",
        price=trade["price"],
        notional=trade["quantity"] * trade["price"],
        executed_at=trade["executed_at"],
    )
    return base


async def _execute_watchlist_change(
    change: dict[str, Any],
    source: MarketDataSource,
) -> dict[str, Any]:
    ticker = change["ticker"].upper()
    action = change["action"]
    base = {"ticker": ticker, "action": action, "status": "rejected", "error": None}

    if action == "add":
        row = add_watchlist(ticker)
        if row is None:
            base["error"] = f"{ticker} already in watchlist"
            return base
        await source.add_ticker(ticker)
    elif action == "remove":
        removed = remove_watchlist(ticker)
        if not removed:
            base["error"] = f"{ticker} not in watchlist"
            return base
        await source.remove_ticker(ticker)
    else:
        base["error"] = f"unknown action: {action}"
        return base

    base["status"] = "executed"
    return base


@router.post("")
async def post_chat(
    body: ChatRequest,
    cache: PriceCache = Depends(get_cache),
    source: MarketDataSource = Depends(get_source),
) -> dict[str, Any]:
    user_text = body.message

    # 1. Persist the user message first so history is coherent even if the LLM fails.
    append_chat(role="user", content=user_text, actions=None)

    # 2. Build context and call the LLM.
    context = _build_context(cache)
    try:
        llm_out = await chat(user_text, context)
    except MalformedLLMResponseError as e:
        logger.warning("Malformed LLM response: %s", e)
        raise HTTPException(status_code=502, detail="LLM returned malformed response")

    # 3. Execute trades and watchlist changes, collecting enriched results.
    enriched_trades: list[dict[str, Any]] = []
    any_trade_executed = False
    for t in llm_out.trades:
        result = _execute_trade(t.model_dump(), cache)
        enriched_trades.append(result)
        if result["status"] == "executed":
            any_trade_executed = True

    enriched_changes: list[dict[str, Any]] = []
    for c in llm_out.watchlist_changes:
        result = await _execute_watchlist_change(c.model_dump(), source)
        enriched_changes.append(result)

    # 4. Snapshot only if at least one trade actually moved the portfolio.
    if any_trade_executed:
        record_snapshot(compute_total_value(cache))

    # 5. Persist the assistant message with enriched actions.
    actions_payload: dict[str, Any] | None
    if enriched_trades or enriched_changes:
        actions_payload = {
            "trades": enriched_trades,
            "watchlist_changes": enriched_changes,
        }
    else:
        actions_payload = None
    append_chat(role="assistant", content=llm_out.message, actions=actions_payload)

    return {
        "message": llm_out.message,
        "trades": enriched_trades,
        "watchlist_changes": enriched_changes,
    }
