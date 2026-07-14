#!/bin/sh
set -e

echo "========================================="
echo "[entrypoint] MRI Report Manager starting..."
echo "========================================="

# Ensure data directories exist
mkdir -p /app/data/db /app/data/uploads/organized

# Create/update database tables using raw SQL
# This uses sqlite3 CLI — 100% reliable, no Node.js module deps
DB_FILE="/app/data/db/mri_reports.db"
SQL_FILE="/app/schema.sql"

if [ -f "$SQL_FILE" ]; then
  echo "[entrypoint] Ensuring database tables exist..."
  sqlite3 "$DB_FILE" < "$SQL_FILE" 2>&1 && echo "[entrypoint] Database ready." || {
    echo "[entrypoint] WARNING: sqlite3 command failed. Trying alternative..."
    # Fallback: create DB file if missing
    [ -f "$DB_FILE" ] || touch "$DB_FILE"
    echo "[entrypoint] App will attempt to use database as-is."
  }
else
  echo "[entrypoint] WARNING: schema.sql not found — skipping DB setup"
  # Ensure DB file exists so Prisma Client doesn't crash
  [ -f "$DB_FILE" ] || touch "$DB_FILE"
fi

echo "[entrypoint] Starting application on port ${PORT:-3000}..."
echo "========================================="

exec "$@"