#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# prod.sh — Build and deploy the production stack
#
# Usage:
#   ENV_FILE=.env.production pnpm prod     # default
#   SKIP_BUILD=true pnpm prod              # skip Docker build (image already built)
#   SKIP_MIGRATE=true pnpm prod            # skip migration (already applied)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"

# ── Pre-flight checks ─────────────────────────────────────────────────────────
if [ ! -f "$ENV_FILE" ]; then
  echo "❌  $ENV_FILE not found."
  echo "    Copy .env.example to $ENV_FILE and fill in production values:"
  echo "    cp .env.example $ENV_FILE"
  exit 1
fi

# Load prod env for migration + startup step
set -o allexport
# shellcheck disable=SC1090
source <(grep -v '^\s*#' "$ENV_FILE" | grep -v '^\s*$')
set +o allexport
export NODE_ENV=production

# Guard against wildcard CORS in production
if echo "${CORS_ORIGINS:-}" | grep -q '\*'; then
  echo "❌  CORS_ORIGINS must not contain '*' in production."
  exit 1
fi

# Guard missing secrets
for var in DATABASE_URL BETTER_AUTH_URL BETTER_AUTH_SECRET COOKIE_SECRET; do
  if [ -z "${!var:-}" ]; then
    echo "❌  Required env var not set: $var"
    exit 1
  fi
done

echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║    NestJS Better-Auth — Production Deploy ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

# ── 1. Build Docker image ─────────────────────────────────────────────────────
if [ "${SKIP_BUILD:-false}" != "true" ]; then
  echo "▶  Building Docker image (nest-better-auth:latest)..."
  docker build -t nest-better-auth:latest .
  echo "✓  Image built"
else
  echo "⏭   Skipping build (SKIP_BUILD=true)"
fi

# ── 2. Start prod infrastructure ──────────────────────────────────────────────
echo "▶  Starting production infrastructure (Postgres, Redis, MinIO)..."
docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  up -d postgres redis minio

# Wait for Postgres
echo -n "⏳  Waiting for Postgres"
until docker compose exec -T postgres \
  pg_isready -U "${POSTGRES_USER:-postgres}" -q 2>/dev/null; do
  printf '.'
  sleep 1
done
echo " ✓"

# ── 3. Run migrations ─────────────────────────────────────────────────────────
if [ "${SKIP_MIGRATE:-false}" != "true" ]; then
  echo "▶  Generating migrations from schema..."
  NODE_ENV=production pnpm db:generate

  echo "▶  Applying migrations (NODE_ENV=production)..."
  NODE_ENV=production pnpm db:migrate
  echo "✓  Migrations complete"
else
  echo "⏭   Skipping migrations (SKIP_MIGRATE=true)"
fi

# ── 4. Start API container ────────────────────────────────────────────────────
echo "▶  Starting API container..."
docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  up -d api

# Wait for health check
echo -n "⏳  Waiting for API health check"
RETRIES=30
until curl -sf "http://localhost:${PORT:-3000}/health" > /dev/null 2>&1 || [ "$RETRIES" -eq 0 ]; do
  printf '.'
  sleep 2
  RETRIES=$((RETRIES - 1))
done

if [ "$RETRIES" -eq 0 ]; then
  echo " ✗"
  echo "❌  API did not become healthy. Check logs: docker compose logs api"
  exit 1
fi
echo " ✓"

echo ""
echo "✅  Production stack is running:"
echo "   API     → http://localhost:${PORT:-3000}"
echo "   Health  → http://localhost:${PORT:-3000}/health"
echo "   Metrics → http://localhost:${PORT:-3000}/metrics"
echo ""
