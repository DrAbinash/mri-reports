#!/bin/sh
set -e

echo "========================================="
echo "[entrypoint] MRI Report Manager starting..."
echo "[entrypoint] Node.js: $(node --version)"
echo "[entrypoint] Platform: $(uname -m)"
echo "========================================="

# Ensure data directories exist
mkdir -p /app/data/db /app/data/uploads/organized

# Create/update database tables using raw SQL via sqlite3 CLI
# This is 100% reliable — no Node.js module dependencies needed
DB_FILE="/app/data/db/mri_reports.db"
SQL_FILE="/app/schema.sql"

if [ -f "$SQL_FILE" ]; then
  echo "[entrypoint] Setting up database tables..."
  if sqlite3 "$DB_FILE" < "$SQL_FILE" 2>&1; then
    echo "[entrypoint] Database tables created/verified."
  else
    echo "[entrypoint] WARNING: sqlite3 setup had issues, continuing anyway..."
    [ -f "$DB_FILE" ] || touch "$DB_FILE"
  fi
else
  echo "[entrypoint] WARNING: schema.sql not found — skipping DB setup"
  [ -f "$DB_FILE" ] || touch "$DB_FILE"
fi

# Verify Prisma engine exists
ENGINE_FILE=$(find /app/node_modules/.prisma -name "libquery_engine*" -type f 2>/dev/null | head -1)
if [ -n "$ENGINE_FILE" ]; then
  echo "[entrypoint] Prisma engine found: $(basename "$ENGINE_FILE")"
else
  echo "[entrypoint] WARNING: No Prisma engine binary found! DB queries will fail."
  echo "[entrypoint] Engine search path: /app/node_modules/.prisma/"
  ls -la /app/node_modules/.prisma/ 2>/dev/null || echo "[entrypoint] .prisma directory missing"
  ls -la /app/node_modules/.prisma/client/ 2>/dev/null || echo "[entrypoint] .prisma/client directory missing"
fi

# Verify server.js exists
if [ -f "/app/server.js" ]; then
  echo "[entrypoint] server.js found."
else
  echo "[entrypoint] FATAL: server.js not found! Build may have failed."
  ls -la /app/ 2>/dev/null
  exit 1
fi

echo "[entrypoint] Starting application on port ${PORT:-3000}..."
echo "========================================="

exec "$@"