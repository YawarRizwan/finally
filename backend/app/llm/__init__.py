"""LLM chat subsystem for FinAlly.

Public API:
    chat(user_message, context) -> LLMOutput
    LLMOutput, TradeIntent, WatchlistChange - minimal structured-output schema
    build_messages - pure context assembly, useful for testing/debugging
    MalformedLLMResponseError - raised on unparseable model output
"""

from .chat import chat
from .context import build_messages
from .errors import MalformedLLMResponseError
from .schema import LLMOutput, TradeIntent, WatchlistChange

__all__ = [
    "chat",
    "build_messages",
    "LLMOutput",
    "TradeIntent",
    "WatchlistChange",
    "MalformedLLMResponseError",
]
