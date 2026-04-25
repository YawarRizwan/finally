"""Portfolio snapshot background task.

Records a portfolio-value row every ``PORTFOLIO_SNAPSHOT_INTERVAL_SECONDS``
seconds (default 60). The initial snapshot at DB init and the post-trade
snapshots are handled elsewhere (see PLAN.md §7).
"""

from __future__ import annotations

import asyncio
import logging
import os

from app.db import record_snapshot
from app.market import PriceCache
from app.portfolio import compute_total_value

logger = logging.getLogger(__name__)

DEFAULT_INTERVAL_SECONDS = 60.0


def _read_interval() -> float:
    raw = os.environ.get("PORTFOLIO_SNAPSHOT_INTERVAL_SECONDS")
    if not raw:
        return DEFAULT_INTERVAL_SECONDS
    try:
        value = float(raw)
        return value if value > 0 else DEFAULT_INTERVAL_SECONDS
    except ValueError:
        return DEFAULT_INTERVAL_SECONDS


async def snapshot_loop(cache: PriceCache) -> None:
    """Sleep, then snapshot, repeat until cancelled."""
    interval = _read_interval()
    logger.info("Snapshot task started (interval=%.1fs)", interval)
    try:
        while True:
            await asyncio.sleep(interval)
            try:
                total = compute_total_value(cache)
                record_snapshot(total)
            except Exception:
                logger.exception("Snapshot tick failed")
    except asyncio.CancelledError:
        logger.info("Snapshot task cancelled")
        raise
