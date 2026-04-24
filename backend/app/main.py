"""FinAlly FastAPI entrypoint.

Wires the DB, market data source, price cache, LLM, routers, and static
frontend into a single ASGI app. The market data subsystem owns the SSE
endpoint; this module just mounts its router.
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api import chat as chat_api
from app.api import health as health_api
from app.api import portfolio as portfolio_api
from app.api import watchlist as watchlist_api
from app.db import init_db, list_watchlist
from app.market import PriceCache, create_market_data_source
from app.tasks.snapshot import snapshot_loop

logger = logging.getLogger(__name__)

_PROJECT_ROOT = Path(__file__).resolve().parents[2]
_CONTAINER_STATIC = Path("/app/static")
_DEV_STATIC = _PROJECT_ROOT / "frontend" / "out"


def _resolve_static_dir() -> Path | None:
    if _CONTAINER_STATIC.is_dir():
        return _CONTAINER_STATIC
    if _DEV_STATIC.is_dir():
        return _DEV_STATIC
    return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Ensure DB is initialized and seeded.
    init_db()

    # 2. Wire market data: one cache, one source.
    cache = PriceCache()
    source = create_market_data_source(cache)
    tickers = [row["ticker"] for row in list_watchlist()]
    await source.start(tickers)

    # 3. Start the snapshot background task.
    snapshot_task = asyncio.create_task(snapshot_loop(cache))

    app.state.price_cache = cache
    app.state.market_source = source
    app.state.snapshot_task = snapshot_task

    logger.info("FinAlly backend startup complete (tickers=%d)", len(tickers))
    try:
        yield
    finally:
        snapshot_task.cancel()
        try:
            await snapshot_task
        except asyncio.CancelledError:
            pass
        await source.stop()
        logger.info("FinAlly backend shutdown complete")


def create_app() -> FastAPI:
    app = FastAPI(title="FinAlly", version="0.1.0", lifespan=lifespan)

    # API routers — mount BEFORE static + catch-all so /api/* always matches first.
    app.include_router(health_api.router)
    app.include_router(portfolio_api.router)
    app.include_router(watchlist_api.router)
    app.include_router(chat_api.router)

    # SSE router owns its own /api/stream prefix.
    # The cache is created during lifespan, so register a proxy router that
    # defers to the app state. Simpler: register a per-request shim.
    _mount_stream_router(app)

    # Static frontend + SPA fallback.
    #
    # Starlette mounts swallow all matching paths, so the catch-all SPA route
    # must be declared BEFORE the root StaticFiles mount for API/SSE routes
    # to remain reachable. We keep Next.js asset prefixes mounted explicitly
    # so hashed assets get proper static-file headers.
    static_dir = _resolve_static_dir()
    if static_dir is not None:
        _mount_static(app, static_dir)
    else:
        logger.warning(
            "Static directory not found (checked %s and %s); skipping frontend mount",
            _CONTAINER_STATIC,
            _DEV_STATIC,
        )

    return app


def _mount_static(app: FastAPI, static_dir: Path) -> None:
    """Mount the Next.js static export plus an SPA catch-all fallback."""
    # Explicit sub-mounts for hashed assets so they get long-cache headers.
    next_dir = static_dir / "_next"
    if next_dir.is_dir():
        app.mount("/_next", StaticFiles(directory=str(next_dir)), name="next_assets")

    index_path = static_dir / "index.html"

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str) -> FileResponse:
        # API routes and /_next already matched above. Here we either serve
        # a static file that exists under the export root, or fall back to
        # index.html so client-side routing works.
        candidate = static_dir / full_path if full_path else index_path
        if candidate.is_file():
            return FileResponse(str(candidate))
        return FileResponse(str(index_path))


def _mount_stream_router(app: FastAPI) -> None:
    """Attach the SSE router once the app's cache is available.

    The market module's ``create_stream_router`` needs the PriceCache at
    creation time, but the cache is only instantiated inside ``lifespan``.
    We lazily wire a thin router that looks up the cache on each request.
    """
    from fastapi import APIRouter, Request
    from fastapi.responses import StreamingResponse

    from app.market.stream import _generate_events  # internal generator

    router = APIRouter(prefix="/api/stream", tags=["streaming"])

    @router.get("/prices")
    async def stream_prices(request: Request) -> StreamingResponse:
        cache = request.app.state.price_cache
        return StreamingResponse(
            _generate_events(cache, request),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    app.include_router(router)


app = create_app()
