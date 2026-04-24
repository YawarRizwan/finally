"""Placeholder.

The data layer lives at ``backend/app/db/`` so it is importable as ``app.db``
alongside ``app.market``. ``pyproject.toml`` only declares ``app`` as a package,
and existing tests import via ``from app.db import ...``.

See ``backend/app/db/`` for schema.sql, connection.py, repository.py, seed.py,
and errors.py.
"""
