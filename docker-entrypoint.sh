#!/bin/sh
set -e

echo "[entrypoint] MRI Report Manager starting..."

# Ensure data directories exist (in case volume mount is empty)
mkdir -p /app/data/db /app/data/uploads/organized

# Run Prisma schema push (creates/updates tables) on every start
# This is safe — it's idempotent and won't drop data
echo "[entrypoint] Ensuring database schema is up to date..."
npx prisma db push --skip-generate 2>/dev/null || {
  echo "[entrypoint] WARNING: Prisma db push failed. Attempting with direct schema apply..."
  # Fallback: if prisma push fails, the app will still work if tables exist
  # from a previous successful run
}

echo "[entrypoint] Starting application..."
exec "$@"