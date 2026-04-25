#!/usr/bin/env bash
# Start the FinAlly container on macOS / Linux.
# Idempotent: safe to re-run. Pass --build to force an image rebuild.

set -euo pipefail

IMAGE_NAME="finally:latest"
CONTAINER_NAME="finally"
VOLUME_NAME="finally-data"
HOST_PORT="8000"
CONTAINER_PORT="8000"

# Resolve the repository root so the script works from any cwd.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

FORCE_BUILD=0
OPEN_BROWSER=0

for arg in "$@"; do
  case "${arg}" in
    --build)   FORCE_BUILD=1 ;;
    --open)    OPEN_BROWSER=1 ;;
    -h|--help)
      cat <<EOF
Usage: $(basename "$0") [--build] [--open]

  --build   Force a docker image rebuild before starting.
  --open    Open the app in the default browser after start.
EOF
      exit 0
      ;;
    *)
      echo "Unknown argument: ${arg}" >&2
      exit 2
      ;;
  esac
done

if [[ ! -f .env ]]; then
  echo "ERROR: .env not found at ${REPO_ROOT}/.env" >&2
  echo "       Copy .env.example to .env and fill in OPENROUTER_API_KEY." >&2
  exit 1
fi

# Build the image if missing or on --build.
if [[ "${FORCE_BUILD}" -eq 1 ]] || ! docker image inspect "${IMAGE_NAME}" >/dev/null 2>&1; then
  echo "Building image ${IMAGE_NAME}..."
  docker build -t "${IMAGE_NAME}" .
else
  echo "Image ${IMAGE_NAME} already present. Use --build to rebuild."
fi

# Remove any previous container with the same name (idempotent restart).
if docker ps -a --format '{{.Names}}' | grep -qx "${CONTAINER_NAME}"; then
  echo "Removing existing container ${CONTAINER_NAME}..."
  docker stop "${CONTAINER_NAME}" >/dev/null 2>&1 || true
  docker rm "${CONTAINER_NAME}" >/dev/null 2>&1 || true
fi

echo "Starting container ${CONTAINER_NAME}..."
docker run -d \
  --name "${CONTAINER_NAME}" \
  --env-file .env \
  -p "${HOST_PORT}:${CONTAINER_PORT}" \
  -v "${VOLUME_NAME}:/app/db" \
  --restart unless-stopped \
  "${IMAGE_NAME}" >/dev/null

URL="http://localhost:${HOST_PORT}"
echo "FinAlly is starting at ${URL}"
echo "View logs with: docker logs -f ${CONTAINER_NAME}"

if [[ "${OPEN_BROWSER}" -eq 1 ]]; then
  if command -v open >/dev/null 2>&1; then
    open "${URL}" || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "${URL}" || true
  fi
fi
