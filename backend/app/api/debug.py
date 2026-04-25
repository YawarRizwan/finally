"""Debug/test-only endpoints.

Only mounted when the app is running with LLM_MOCK=true (i.e. in test mode).
Not exposed in production.
"""

from __future__ import annotations

import os
from typing import Any

from fastapi import APIRouter, HTTPException

from app.db import reset_to_defaults

router = APIRouter(prefix="/api/debug", tags=["debug"])


@router.post("/reset")
async def reset_state() -> dict[str, Any]:
    """Hard-reset all user state to the initial seed (cash=$10k, no positions)."""
    if os.environ.get("LLM_MOCK", "").lower() != "true":
        raise HTTPException(status_code=404, detail="Not found")
    reset_to_defaults()
    return {"status": "reset"}
