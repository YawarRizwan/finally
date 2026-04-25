"""LiteLLM call via OpenRouter with Cerebras inference.

Isolated so `chat.py` can monkeypatch this one function in unit tests.
"""

from __future__ import annotations

from typing import Any

from litellm import completion

from .schema import LLMOutput

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}


def call_model(messages: list[dict[str, Any]]) -> str:
    """Call the model and return the raw string content of the response."""
    response = completion(
        model=MODEL,
        messages=messages,
        response_format=LLMOutput,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
    )
    return response.choices[0].message.content
