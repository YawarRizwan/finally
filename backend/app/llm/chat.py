"""Public entry point for LLM chat.

The backend calls `chat(user_message, context)` and receives a minimal
`LLMOutput`. The backend is responsible for validating and executing any
trades or watchlist changes, persisting chat history, and enriching the
response with execution results.
"""

from __future__ import annotations

import os
from typing import Any

from pydantic import ValidationError

from . import client
from .context import build_messages
from .errors import MalformedLLMResponseError
from .mock import mock_response
from .schema import LLMOutput


def _mock_enabled() -> bool:
    return os.environ.get("LLM_MOCK", "").lower() == "true"


async def chat(user_message: str, context: dict[str, Any]) -> LLMOutput:
    """Send a user message to the LLM and return the parsed structured output.

    In mock mode (`LLM_MOCK=true`), returns the pinned fixture with zero network.
    Raises `MalformedLLMResponseError` if the model returns unparseable output.
    """
    if _mock_enabled():
        return mock_response()

    messages = build_messages(user_message, context)
    raw = client.call_model(messages)

    if raw is None:
        raise MalformedLLMResponseError("LLM returned no content", raw_content=None)

    try:
        return LLMOutput.model_validate_json(raw)
    except ValidationError as e:
        raise MalformedLLMResponseError(
            f"LLM response did not match schema: {e}",
            raw_content=raw,
        ) from e
    except ValueError as e:
        raise MalformedLLMResponseError(
            f"LLM response was not valid JSON: {e}",
            raw_content=raw,
        ) from e
