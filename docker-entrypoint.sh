#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "=========================================="
  echo "==> Running Prisma Database Migrations..."
  echo "=========================================="
  npx prisma migrate deploy || true

  echo "=========================================="
  echo "==> Running Prisma Database Seed..."
  echo "=========================================="
  npx prisma db seed || true
fi

echo "=========================================="
echo "==> Starting EDPCtiket Application..."
echo "=========================================="
exec "$@"
