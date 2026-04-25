"""Portfolio valuation helpers shared by routes and the snapshot task."""

from __future__ import annotations

from typing import Any

from app.db import get_positions, get_profile
from app.market import PriceCache


def build_portfolio(cache: PriceCache, user_id: str = "default") -> dict[str, Any]:
    """Compute portfolio view: cash, enriched positions, total value, unrealized P&L.

    Each position is enriched with the latest price from the cache. If the
    cache has no entry for a ticker, ``price``, ``unrealized_pnl`` and
    ``change_percent`` are ``None`` and the position's contribution to
    ``total_value`` falls back to ``quantity * avg_cost``.
    """
    profile = get_profile(user_id) or {"cash_balance": 0.0}
    cash = float(profile["cash_balance"])
    raw = get_positions(user_id)

    positions: list[dict[str, Any]] = []
    total_market = 0.0
    total_unrealized = 0.0

    for row in raw:
        ticker = row["ticker"]
        qty = float(row["quantity"])
        avg_cost = float(row["avg_cost"])
        update = cache.get(ticker)
        if update is not None:
            price = float(update.price)
            mkt_value = price * qty
            cost_basis = avg_cost * qty
            unrealized = mkt_value - cost_basis
            change_pct = ((price - avg_cost) / avg_cost * 100) if avg_cost else None
            total_market += mkt_value
            total_unrealized += unrealized
        else:
            price = None
            unrealized = None
            change_pct = None
            # Fallback so total_value remains meaningful when cache is cold.
            total_market += avg_cost * qty

        mkt_value_pos = price * qty if price is not None else avg_cost * qty
        positions.append(
            {
                "ticker": ticker,
                "quantity": qty,
                "avg_cost": avg_cost,
                "current_price": price,
                "market_value": mkt_value_pos,
                "unrealized_pl": unrealized if unrealized is not None else 0.0,
                "unrealized_pl_pct": change_pct if change_pct is not None else 0.0,
            }
        )

    total_value = cash + total_market
    return {
        "cash_balance": cash,
        "positions": positions,
        "total_value": total_value,
        "total_unrealized_pl": total_unrealized,
    }


def compute_total_value(cache: PriceCache, user_id: str = "default") -> float:
    """Fast path used by the snapshot task — returns total_value only."""
    return build_portfolio(cache, user_id)["total_value"]
