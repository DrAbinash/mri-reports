#!/bin/sh
set -e

echo "========================================="
echo "[entrypoint] MRI Report Manager starting..."
echo "========================================="

# Ensure data directories exist (Synology volumes may be empty on first mount)
mkdir -p /app/data/db /app/data/uploads/organized

# Run Prisma schema push — creates/updates tables, safe and idempotent
echo "[entrypoint] Syncing database schema..."
if [ -f /app/prisma/schema.prisma ]; then
  node /app/node_modules/prisma/build/index.js db push --skip-generate --schema=/app/prisma/schema.prisma 2>&1 || {
    echo "[entrypoint] WARNING: prisma db push had an issue. App will still start."
  }
else
  echo "[entrypoint] WARNING: schema.prisma not found — skipping DB migration"
fi

echo "[entrypoint] Database ready."
echo "[entrypoint] Starting application on port ${PORT:-3000}..."
echo "========================================="

exec "$@"