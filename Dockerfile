# syntax=docker/dockerfile:1.7

# ---------- Stage 1: build frontend static export ----------
FROM node:20-slim AS frontend-build

WORKDIR /build

# Copy manifests first for better layer caching. If package-lock.json is
# missing we fall back to `npm install`.
COPY frontend/package.json frontend/package-lock.json* ./

RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy the rest of the frontend sources and build the static export.
# Next.js with `output: 'export'` writes to ./out by default.
COPY frontend/ ./

RUN npm run build


# ---------- Stage 2: runtime image (Python + FastAPI) ----------
FROM python:3.12-slim AS runtime

# Minimal runtime packages. curl is used by HEALTHCHECK.
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Install uv (pinned, copied from the official distroless image).
COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /uvx /usr/local/bin/

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_SYSTEM_PYTHON=1 \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    PORT=8000

WORKDIR /app

# Install Python dependencies from the lockfile into /app/.venv. Doing this
# before copying the full backend source keeps the layer cacheable.
COPY backend/pyproject.toml backend/uv.lock ./

RUN uv sync --frozen --no-dev --no-install-project

# Copy the backend application source.
COPY backend/ ./

# Install the project itself (the `app` package) into the venv.
RUN uv sync --frozen --no-dev

# Copy the built frontend static export into the location the backend serves
# static files from. Matches the deployment contract in PLAN.md section 11.
COPY --from=frontend-build /build/out /app/static

# Volume mount target for the SQLite database file.
RUN mkdir -p /app/db

# Drop privileges. The non-root user must own the app and db dirs so the
# backend can write the SQLite file to /app/db at runtime.
RUN useradd --create-home --shell /bin/bash --uid 1000 appuser \
 && chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl --fail --silent http://localhost:8000/api/health || exit 1

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
