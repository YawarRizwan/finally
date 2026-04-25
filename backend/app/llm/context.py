"""Context assembly for LLM chat calls.

Pure functions that transform a portfolio-context dict plus a new user message
into the message list sent to the model. No I/O, no network.
"""

from __future__ import annotations

from typing import Any

from .prompt import SYSTEM_PROMPT

HISTORY_LIMIT = 20


def render_portfolio_block(context: dict[str, Any]) -> str:
    """Render the portfolio context as a compact text block for the model.

    Expected keys: cash, positions, watchlist, total_value. Missing keys are
    rendered as sensible defaults so the builder never raises on a partial dict.
    """
    cash = context.get("cash", 0.0)
    total_value = context.get("total_value", 0.0)
    positions = context.get("positions", []) or []
    watchlist = context.get("watchlist", []) or []

    lines = [
        "PORTFOLIO STATE",
        f"Cash: ${cash:,.2f}",
        f"Total value: ${total_value:,.2f}",
        "",
        "Positions:",
    ]
    if positions:
        for p in positions:
            lines.append(
                f"  - {p.get('ticker')}: qty={p.get('quantity')}, "
                f"avg_cost=${p.get('avg_cost')}, "
                f"price=${p.get('price')}, "
                f"unrealized_pnl=${p.get('unrealized_pnl')}"
            )
    else:
        lines.append("  (none)")

    lines.append("")
    lines.append("Watchlist:")
    if watchlist:
        for w in watchlist:
            lines.append(
                f"  - {w.get('ticker')}: price=${w.get('price')}, "
                f"change_percent={w.get('change_percent')}"
            )
    else:
        lines.append("  (empty)")

    return "\n".join(lines)


def _normalize_history(recent: list[dict[str, Any]]) -> list[dict[str, str]]:
    """Trim history to the last HISTORY_LIMIT and keep only role/content."""
    trimmed = recent[-HISTORY_LIMIT:]
    out: list[dict[str, str]] = []
    for msg in trimmed:
        role = msg.get("role")
        content = msg.get("content")
        if role not in ("user", "assistant") or not isinstance(content, str):
            continue
        out.append({"role": role, "content": content})
    return out


def build_messages(user_message: str, context: dict[str, Any]) -> list[dict[str, str]]:
    """Assemble the full message list for the LLM call.

    Order: system prompt -> portfolio state (as a system message) ->
    last 20 history messages -> new user message.
    """
    recent = context.get("recent_messages", []) or []
    messages: list[dict[str, str]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "system", "content": render_portfolio_block(context)},
    ]
    messages.extend(_normalize_history(recent))
    messages.append({"role": "user", "content": user_message})
    return messages
