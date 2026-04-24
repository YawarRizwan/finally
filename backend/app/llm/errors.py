"""Typed errors for the LLM module."""

from __future__ import annotations


class MalformedLLMResponseError(Exception):
    """Raised when the LLM returns output that does not match the schema.

    The backend maps this to a user-visible failure message.
    """

    def __init__(self, message: str, raw_content: str | None = None):
        super().__init__(message)
        self.raw_content = raw_content
