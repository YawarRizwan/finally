"""Typed errors raised by the repository layer."""


class DBError(Exception):
    """Base class for repository errors."""


class InsufficientCashError(DBError):
    """Raised when a buy would exceed available cash."""


class InsufficientSharesError(DBError):
    """Raised when a sell exceeds held quantity or the position does not exist."""
