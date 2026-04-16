#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# bench.sh — HTTP benchmark using autocannon
#
# Usage:
#   pnpm bench                              # run all scenarios (default config)
#   CONNECTIONS=100 DURATION=30 pnpm bench  # heavier load
#   BASE_URL=https://api.example.com pnpm bench  # target remote server
#   SCENARIO=health pnpm bench              # run only one scenario
#
# Scenarios:
#   health       — GET /health (baseline, no auth)
#   session      — GET /v1/api/auth/session (auth endpoint, expect 401)
#   sign-in      — POST /v1/api/auth/sign-in (auth flow, rate-limited)
#   sign-in-bad  — POST /v1/api/auth/sign-in with wrong password (lockout path)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BASE="${BASE_URL:-http://localhost:5555}"
CONNECTIONS="${CONNECTIONS:-50}"
DURATION="${DURATION:-10}"
SCENARIO="${SCENARIO:-all}"
PIPELINING="${PIPELINING:-1}"

command -v node >/dev/null 2>&1 || { echo "❌  node not found"; exit 1; }

echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║         NestJS Better-Auth — Benchmark            ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""
echo "  Target:      $BASE"
echo "  Connections: $CONNECTIONS"
echo "  Duration:    ${DURATION}s"
echo "  Pipelining:  $PIPELINING"
echo ""

# Check server is reachable
if ! curl -sf "$BASE/health" > /dev/null 2>&1; then
  echo "❌  Server not reachable at $BASE/health"
  echo "    Start the server first:  pnpm dev"
  exit 1
fi

run_bench() {
  local name="$1"
  local args="${@:2}"

  echo "──────────────────────────────────────────"
  echo "  Scenario: $name"
  echo "──────────────────────────────────────────"
  # shellcheck disable=SC2086
  node -e "
    const autocannon = require('autocannon');
    const instance = autocannon({
      $args
      connections: $CONNECTIONS,
      duration: $DURATION,
      pipelining: $PIPELINING,
    }, (err, result) => {
      if (err) { console.error(err); process.exit(1); }
      autocannon.printResult(result);
      process.exit(0);
    });
    autocannon.track(instance, { renderProgressBar: true });
  "
  echo ""
}

# ── Scenario: health ─────────────────────────────────────────────────────────
if [ "$SCENARIO" = "all" ] || [ "$SCENARIO" = "health" ]; then
  run_bench "GET /health (baseline)" \
    "url: '${BASE}/health',"
fi

# ── Scenario: session (expect 401 — tests auth guard fast path) ──────────────
if [ "$SCENARIO" = "all" ] || [ "$SCENARIO" = "session" ]; then
  run_bench "GET /v1/api/auth/session (unauthed → 401)" \
    "url: '${BASE}/v1/api/auth/session',"
fi

# ── Scenario: sign-in (valid credentials — tests full auth flow) ─────────────
# Requires seeded admin user. Set BENCH_EMAIL + BENCH_PASSWORD if different.
BENCH_EMAIL="${BENCH_EMAIL:-alice@example.com}"
BENCH_PASS="${BENCH_PASSWORD:-Alice123!}"

if [ "$SCENARIO" = "all" ] || [ "$SCENARIO" = "sign-in" ]; then
  run_bench "POST /v1/api/auth/sign-in (valid credentials)" \
    "url: '${BASE}/v1/api/auth/sign-in',
     method: 'POST',
     headers: { 'content-type': 'application/json' },
     body: JSON.stringify({ email: '${BENCH_EMAIL}', password: '${BENCH_PASS}' }),"
fi

# ── Scenario: sign-in bad password (tests lockout code path) ─────────────────
if [ "$SCENARIO" = "all" ] || [ "$SCENARIO" = "sign-in-bad" ]; then
  run_bench "POST /v1/api/auth/sign-in (wrong password → 401/429)" \
    "url: '${BASE}/v1/api/auth/sign-in',
     method: 'POST',
     headers: { 'content-type': 'application/json' },
     body: JSON.stringify({ email: '${BENCH_EMAIL}', password: 'wrong-password' }),"
fi

echo "✅  Benchmark complete."
