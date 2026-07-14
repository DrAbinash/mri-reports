#!/bin/sh
set -e

echo "========================================="
echo "[entrypoint] MRI Report Manager starting..."
echo "========================================="

# Ensure data directories exist (in case volume mount is empty)
mkdir -p /app/data/db /app/data/uploads/organized

# Check if database exists
DB_FILE="/app/data/db/mri_reports.db"
SCHEMA_FILE="/app/prisma/schema.prisma"

if [ ! -f "$DB_FILE" ]; then
  echo "[entrypoint] No database found. Creating fresh database..."
fi

# Run Prisma schema push (creates/updates tables) on every start
# This is idempotent — safe to run repeatedly, won't drop existing data
echo "[entrypoint] Syncing database schema..."
if [ -f "$SCHEMA_FILE" ]; then
  node /app/node_modules/prisma/build/index.js db push --skip-generate --schema="$SCHEMA_FILE" 2>&1 || {
    echo "[entrypoint] WARNING: prisma db push encountered an issue."
    echo "[entrypoint] The app will still start. If tables are missing, check the logs above."
  }
else
  echo "[entrypoint] WARNING: prisma/schema.prisma not found — skipping DB migration"
fi

echo "[entrypoint] Database ready."
echo "[entrypoint] Starting application..."
echo "========================================="

exec "$@"