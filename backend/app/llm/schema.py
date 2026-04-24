"""Pydantic schemas for LLM structured output.

The schemas here define the MINIMAL shape returned by the model.
The backend later enriches these with execution results (status, price,
notional, executed_at, error). Enrichment is not this module's concern.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class TradeIntent(BaseModel):
    """A trade the LLM wants to execute."""

    ticker: str = Field(description="Ticker symbol, e.g. AAPL")
    side: Literal["buy", "sell"]
    quantity: float = Field(gt=0, description="Number of shares (fractional allowed)")


class WatchlistChange(BaseModel):
    """A watchlist modification the LLM wants to make."""

    ticker: str = Field(description="Ticker symbol, e.g. AAPL")
    action: Literal["add", "remove"]


class LLMOutput(BaseModel):
    """Minimal structured output returned by the LLM.

    The backend enriches `trades` and `watchlist_changes` with execution
    results after validation and persistence.
    """

    message: str = Field(description="Conversational response to the user")
    trades: list[TradeIntent] = Field(default_factory=list)
    watchlist_changes: list[WatchlistChange] = Field(default_factory=list)
