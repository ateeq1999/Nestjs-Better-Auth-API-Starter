#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# dev.sh — Start the full development stack
#
# Usage:
#   pnpm dev                          # normal start (migrates + seeds + server)
#   SKIP_SEED=true pnpm dev           # skip seed (after first run)
#   SKIP_INFRA=true pnpm dev          # skip docker compose (infra already up)
#   SKIP_MIGRATE=true pnpm dev        # skip migration (schema already current)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"
cd "$ROOT"

# ── Load .env ─────────────────────────────────────────────────────────────────
if [ -f .env ]; then
  # Export only non-commented, non-empty lines
  set -o allexport
  # shellcheck disable=SC1090
  source <(grep -v '^\s*#' .env | grep -v '^\s*$')
  set +o allexport
else
  echo "⚠️   No .env file found — copy .env.example to .env and fill in values."
  echo "    cp .env.example .env"
  exit 1
fi

export NODE_ENV="${NODE_ENV:-development}"

echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║      NestJS Better-Auth — Dev Start       ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

# ── 1. Infrastructure ─────────────────────────────────────────────────────────
if [ "${SKIP_INFRA:-false}" != "true" ]; then
  echo "▶  Starting dev infrastructure (Postgres, Redis, Mailpit, MinIO)..."
  docker compose up -d postgres redis mailpit minio

  # Wait for Postgres (healthcheck polls every 5s — usually ready in <10s)
  echo -n "⏳  Waiting for Postgres"
  until docker compose exec -T postgres pg_isready -U "${POSTGRES_USER:-postgres}" -q 2>/dev/null; do
    printf '.'
    sleep 1
  done
  echo " ✓"

  # Wait for Redis
  echo -n "⏳  Waiting for Redis"
  until docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q "PONG"; do
    printf '.'
    sleep 1
  done
  echo " ✓"
else
  echo "⏭   Skipping infra start (SKIP_INFRA=true)"
fi

# ── 2. Migrations ─────────────────────────────────────────────────────────────
if [ "${SKIP_MIGRATE:-false}" != "true" ]; then
  echo "▶  Running DB migrations..."
  pnpm db:migrate
  echo "✓  Migrations complete"
else
  echo "⏭   Skipping migrations (SKIP_MIGRATE=true)"
fi

# ── 3. Seed data ──────────────────────────────────────────────────────────────
if [ "${SKIP_SEED:-false}" != "true" ]; then
  echo "▶  Seeding dev data..."
  pnpm db:seed
else
  echo "⏭   Skipping seed (SKIP_SEED=true)"
fi

# ── 4. Dev server ─────────────────────────────────────────────────────────────
echo ""
echo "▶  Starting NestJS dev server (watch mode)..."
echo ""
exec pnpm start:dev
