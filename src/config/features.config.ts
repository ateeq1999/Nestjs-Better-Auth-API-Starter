/**
 * Feature flag defaults — edit this file to turn features on/off project-wide.
 *
 * Every flag can also be overridden at runtime via an environment variable:
 *   FEATURE_<SCREAMING_SNAKE_CASE>=true|false
 *
 * Examples:
 *   FEATURE_SWAGGER=false          # disable API docs in staging
 *   FEATURE_TRACING=true           # enable OTel in production
 *   FEATURE_EMAIL_QUEUE=false      # run without Redis in CI
 *
 * Env vars win over the defaults here — so you can ship one Docker image and
 * toggle features per environment without rebuilding.
 */
export const featureDefaults = {
  // ── Infrastructure ──────────────────────────────────────────────────────────
  /** Redis-backed session cache + BullMQ queue driver. Requires REDIS_URL. */
  redis: true,
  /** Async email dispatch via BullMQ. Requires `redis: true` + REDIS_URL. */
  emailQueue: true,

  // ── Auth plugins (better-auth) ───────────────────────────────────────────
  /** TOTP two-factor authentication. */
  twoFactor: true,
  /** Passwordless magic-link email sign-in. */
  magicLink: true,
  /** Multi-tenant organization support. */
  organization: true,
  /** Google / Apple OAuth social sign-in. Requires provider env vars. */
  socialAuth: true,

  // ── API surface ──────────────────────────────────────────────────────────
  /** Swagger / OpenAPI docs at /docs. Recommended off in production. */
  swagger: true,
  /** Per-route rate limiting via @nestjs/throttler. */
  rateLimiting: true,
  /** Auth event audit trail (sign-in, sign-up, lockout, etc.). */
  auditLog: true,
  /** Scheduled cleanup cron jobs (expired sessions, old audit logs). */
  scheduler: true,
  /** Dev-only email preview route at /dev/email. Always off in production. */
  emailPreview: true,

  // ── Observability ────────────────────────────────────────────────────────
  /** Prometheus metrics endpoint at /metrics. */
  metrics: true,
  /** OpenTelemetry tracing via OTLP exporter. Heavy — opt-in. Requires OTEL_ENABLED=true too. */
  tracing: false,
  /** Ship Pino logs to Loki. Requires LOKI_URL. */
  logShipping: false,
} as const;

export type FeatureFlags = typeof featureDefaults;
export type FeatureKey = keyof FeatureFlags;
