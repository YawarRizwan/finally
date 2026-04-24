"""Pydantic request/response models for FinAlly API routes."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


# ---------- requests ----------


class TradeRequest(BaseModel):
    ticker: str = Field(min_length=1)
    quantity: float = Field(gt=0)
    side: Literal["buy", "sell"]


class WatchlistAddRequest(BaseModel):
    ticker: str = Field(min_length=1)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)


# ---------- responses ----------


class PositionOut(BaseModel):
    ticker: str
    quantity: float
    avg_cost: float
    price: float | None
    unrealized_pnl: float | None
    change_percent: float | None


class PortfolioOut(BaseModel):
    cash: float
    positions: list[PositionOut]
    total_value: float
    unrealized_pnl: float


class TradeOut(BaseModel):
    id: str
    ticker: str
    side: str
    quantity: float
    price: float
    notional: float
    executed_at: str
    status: str = "executed"


class SnapshotOut(BaseModel):
    recorded_at: str
    total_value: float


class WatchlistItemOut(BaseModel):
    ticker: str
    price: float | None
    prev_price: float | None
    open_price: float | None
    direction: str | None
    timestamp: str | None


class ChatMessageOut(BaseModel):
    role: str
    content: str
    actions: Any | None
    created_at: str


class ChatResponse(BaseModel):
    message: str
    trades: list[dict[str, Any]]
    watchlist_changes: list[dict[str, Any]]
