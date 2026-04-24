#!/usr/bin/env bash
# Stop and remove the FinAlly container. Does NOT remove the data volume.
# Idempotent: a missing container is not an error.

set -euo pipefail

CONTAINER_NAME="finally"

if docker ps -a --format '{{.Names}}' | grep -qx "${CONTAINER_NAME}"; then
  echo "Stopping container ${CONTAINER_NAME}..."
  docker stop "${CONTAINER_NAME}" >/dev/null 2>&1 || true
  docker rm "${CONTAINER_NAME}" >/dev/null 2>&1 || true
  echo "Stopped."
else
  echo "No container named ${CONTAINER_NAME} is running."
fi

echo "Note: the finally-data volume is preserved. Remove it manually with:"
echo "  docker volume rm finally-data"
