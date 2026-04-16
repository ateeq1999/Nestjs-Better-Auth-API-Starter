# Configuration Guide

This guide covers all configuration options for the NestJS Better-Auth API Starter.

## Environment Variables

### Core Configuration

| Variable                   | Required  | Default                                       | Description                                       |
| -------------------------- | --------- | --------------------------------------------- | ------------------------------------------------- |
| `PORT`                     | No        | `5555`                                        | HTTP server port                                  |
| `NODE_ENV`                 | No        | `development`                                 | Environment: `development` or `production`        |
| `DATABASE_URL`             | **Yes**   | —                                             | PostgreSQL connection string                      |
| `DB_POOL_MAX`              | No        | `10`                                          | Maximum database pool connections                 |
| `BETTER_AUTH_URL`          | **Yes**   | —                                             | Public base URL (e.g., `https://api.example.com`) |
| `BETTER_AUTH_SECRET`       | **Yes**   | —                                             | Auth secret key (minimum 32 characters)           |
| `COOKIE_SECRET`            | Prod only | —                                             | Cookie signing secret (required in production)    |
| `CORS_ORIGINS`             | No        | `http://localhost:5173,http://localhost:3000` | Allowed CORS origins (comma-separated)            |
| `ALLOWED_CALLBACK_SCHEMES` | No        | —                                             | Custom URI schemes for OAuth deep links           |
| `APP_NAME`                 | No        | `NestJS Better-Auth`                          | Application name for emails                       |

### Database

```env
# PostgreSQL (required)
DATABASE_URL=postgresql://postgres:password@localhost:5432/mydb

# Connection pool
DB_POOL_MAX=20
```

### Authentication

```env
# Better Auth
BETTER_AUTH_URL=https://api.example.com
BETTER_AUTH_SECRET=your-secret-at-least-32-characters-long

# Cookie (production)
COOKIE_SECRET=another-secret-at-least-32-chars

# CORS
CORS_ORIGINS=https://app.example.com,https://admin.example.com

# Deep link schemes (mobile apps)
ALLOWED_CALLBACK_SCHEMES=myapp,myapp-dev
```

## Social Authentication

### Google OAuth

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Apple Sign-In

```env
APPLE_CLIENT_ID=your-apple-client-id
APPLE_CLIENT_SECRET=your-apple-client-secret
```

### Custom OAuth Providers

Add custom OAuth providers via `genericOAuth` plugin in `auth.config.ts`:

```typescript
import { genericOAuth, keycloak, auth0, okta } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [
    genericOAuth({
      config: [
        // Pre-configured providers
        keycloak({
          clientId: process.env.KEYCLOAK_CLIENT_ID!,
          clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
          issuer: process.env.KEYCLOAK_ISSUER!,
        }),
        // Or manual configuration
        {
          providerId: "custom-provider",
          discoveryUrl:
            "https://auth.example.com/.well-known/openid-configuration",
          clientId: process.env.CUSTOM_CLIENT_ID!,
          clientSecret: process.env.CUSTOM_CLIENT_SECRET!,
        },
      ],
    }),
  ],
});
```

## Email Configuration

### SMTP Settings

| Variable    | Default             | Description          |
| ----------- | ------------------- | -------------------- |
| `SMTP_HOST` | `localhost`         | SMTP server hostname |
| `SMTP_PORT` | `1025`              | SMTP server port     |
| `SMTP_FROM` | `noreply@localhost` | From email address   |
| `SMTP_USER` | —                   | SMTP username        |
| `SMTP_PASS` | —                   | SMTP password        |

```env
# Development (Mailpit)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM=noreply@example.com

# Production
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

## Redis Configuration

```env
# Required for session cache and BullMQ
REDIS_URL=redis://localhost:6379

# Optional: separate connections
REDIS_CACHE_URL=redis://localhost:6379/0
REDIS_QUEUE_URL=redis://localhost:6379/1
```

## File Storage

### Local Filesystem (Development)

```env
STORAGE_DRIVER=fs
```

### MinIO (Self-hosted S3)

```env
STORAGE_DRIVER=minio
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=uploads
MINIO_PUBLIC_URL=http://localhost:9000/uploads
```

### AWS S3

```env
STORAGE_DRIVER=s3
AWS_REGION=us-east-1
AWS_BUCKET=my-bucket
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_PUBLIC_URL=https://s3.amazonaws.com/my-bucket
```

### Cloudflare R2

```env
STORAGE_DRIVER=r2
R2_ACCOUNT_ID=your-account-id
R2_BUCKET=my-bucket
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_PUBLIC_URL=https://pub-xxx.r2.dev/my-bucket
```

## Observability

### Prometheus Metrics

Metrics are exposed at `/metrics` when `FEATURE_METRICS=true` (default).

### OpenTelemetry Tracing

```env
FEATURE_TRACING=true
OTEL_ENABLED=true
OTEL_SERVICE_NAME=nest-better-auth
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

### Loki Log Shipping

```env
FEATURE_LOG_SHIPPING=true
LOKI_URL=http://localhost:3101
```

## Feature Flags

All features can be toggled via `FEATURE_<NAME>` environment variables:

| Variable                | Default | Description                    |
| ----------------------- | ------- | ------------------------------ |
| `FEATURE_REDIS`         | `true`  | Redis session cache + BullMQ   |
| `FEATURE_EMAIL_QUEUE`   | `true`  | Async email via BullMQ         |
| `FEATURE_TWO_FACTOR`    | `true`  | TOTP two-factor authentication |
| `FEATURE_MAGIC_LINK`    | `true`  | Passwordless magic link        |
| `FEATURE_ORGANIZATION`  | `true`  | Multi-tenant organizations     |
| `FEATURE_SOCIAL_AUTH`   | `true`  | Google / Apple OAuth           |
| `FEATURE_SWAGGER`       | `true`  | API docs at `/docs`            |
| `FEATURE_RATE_LIMITING` | `true`  | Request throttling             |
| `FEATURE_AUDIT_LOG`     | `true`  | Auth event audit trail         |
| `FEATURE_SCHEDULER`     | `true`  | Cron cleanup jobs              |
| `FEATURE_EMAIL_PREVIEW` | `true`  | Dev email preview              |
| `FEATURE_METRICS`       | `true`  | Prometheus metrics             |
| `FEATURE_TRACING`       | `false` | OpenTelemetry (opt-in)         |
| `FEATURE_LOG_SHIPPING`  | `false` | Loki integration (opt-in)      |

### Disabling Features

```env
# Disable optional features
FEATURE_TWO_FACTOR=false
FEATURE_MAGIC_LINK=false
FEATURE_ORGANIZATION=false

# Disable heavy features in production
FEATURE_SWAGGER=false
FEATURE_EMAIL_PREVIEW=false
```

## Security Configuration

### Rate Limiting

Default limits (configured in `app.module.ts`):

```typescript
ThrottlerModule.forRoot([
  {
    ttl: 60000, // 1 minute window
    limit: 100, // 100 requests per window
    default: { ttl: 60000, limit: 100 },
  },
]);
```

### Account Lockout

Configured in `src/auth/lockout.service.ts`:

```typescript
MAX_FAILED_ATTEMPTS = 5; // Lock after 5 failures
LOCKOUT_WINDOW = 15 * 60; // 15 minute window
LOCKOUT_DURATION = 30 * 60; // 30 minute lockout
```

### Session Configuration

In `auth.config.ts`:

```typescript
session: {
  expiresIn: 60 * 60 * 24 * 7,    // 7 days
  updateAge: 60 * 60 * 24,         // Refresh if older than 1 day
  cookieCache: { enabled: true, maxAge: 5 * 60 },
},
```

## Application Configuration

### Feature Defaults

Edit `src/config/features.config.ts` to change default values:

```typescript
export const featureDefaults = {
  redis: true,
  emailQueue: true,
  twoFactor: true,
  magicLink: true,
  organization: true,
  socialAuth: true,
  swagger: true,
  rateLimiting: true,
  auditLog: true,
  scheduler: true,
  emailPreview: true,
  metrics: true,
  tracing: false,
  logShipping: false,
};
```

## Environment Examples

### Development

```env
NODE_ENV=development
PORT=5555
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nest_better_auth
BETTER_AUTH_URL=http://localhost:5555
BETTER_AUTH_SECRET=dev-secret-at-least-32-characters-long
REDIS_URL=redis://localhost:6379
SMTP_HOST=localhost
SMTP_PORT=1025
STORAGE_DRIVER=fs
```

### Production

```env
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://user:password@db.example.com:5432/production
BETTER_AUTH_URL=https://api.example.com
BETTER_AUTH_SECRET=production-secret-at-least-32-characters-long
COOKIE_SECRET=production-cookie-secret-32-chars
CORS_ORIGINS=https://app.example.com
REDIS_URL=redis://cache.example.com:6379
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
STORAGE_DRIVER=s3
AWS_REGION=us-east-1
AWS_BUCKET=my-app-uploads
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
FEATURE_SWAGGER=false
FEATURE_EMAIL_PREVIEW=false
FEATURE_TRACING=true
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=https://tempo.example.com:4318
```

## Configuration Validation

The application validates environment variables at startup via `src/config/env.config.ts`. Missing required variables will cause the application to fail to start with a clear error message.

## Related Documentation

- [Quick Start](QUICKSTART.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Better Auth Configuration](https://better-auth.com/docs)
