# NestJS Better-Auth API Starter

A production-ready NestJS API starter with a complete authentication system powered by [better-auth](https://better-auth.com). Built on Fastify for performance, Drizzle ORM for type-safe database access, and PostgreSQL for persistence. Designed to serve both web (cookie-based) and mobile clients (Bearer token) from a single API.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 11 + Fastify |
| Auth | better-auth 1.6 |
| ORM | Drizzle ORM |
| Database | PostgreSQL 16 |
| Cache | Redis 7 + `@nestjs/cache-manager` |
| Queue | BullMQ (email dispatch) |
| Validation | class-validator + class-transformer |
| Rate limiting | @nestjs/throttler |
| API docs | Swagger / OpenAPI (`/docs`) |
| Email (dev) | Mailpit (SMTP trap) |
| Storage | `fs` / MinIO / AWS S3 / Cloudflare R2 (swappable via `STORAGE_DRIVER`) |
| Scheduler | `@nestjs/schedule` (cron cleanup jobs) |
| Metrics | Prometheus via `@willsoto/nestjs-prometheus` (`/metrics`) |
| Tracing | OpenTelemetry SDK (opt-in, OTLP export to Tempo) |
| Email | Handlebars templates + `juice` CSS inlining |
| Runtime | Node.js 24 / pnpm |

---

## Features

### Auth
- **Email + password auth** — sign-up, sign-in, sign-out
- **Email verification** — required before sign-in; re-sendable via authenticated endpoint
- **Password reset** — forget-password / reset-password flow via email token
- **Password change** — authenticated endpoint that verifies the current password first
- **Google OAuth** — optional; activates automatically when env vars are set
- **Apple Sign-In** — optional; required by App Store when any social login is offered
- **Session management** — cookie-based sessions (web) and Bearer tokens (mobile)
- **Two-factor authentication** — TOTP via better-auth `twoFactor` plugin

### Security
- **`@fastify/helmet`** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- **Protected routes** — `AuthGuard` + `@CurrentUser()` decorator; supports both cookie and Bearer
- **Rate limiting** — 100 req/min globally; 20 req/min on auth; 10 req/min on password endpoints
- **Account lockout** — locks after 5 failures in 15 min; auto-unlocks after 30 min
- **CORS** — configurable per-environment; wildcard `*` blocked in production
- **Callback URL allowlist** — `callbackURL` / `redirectTo` validated against CORS origins + custom schemes
- **Audit log** — records auth events (sign-in, lockout, password change) with IP + user agent
- **Request ID** — `X-Request-Id` on every response for end-to-end tracing
- **Proxy header stripping** — `x-forwarded-*` and related headers scrubbed before forwarding
- **Input validation** — global `ValidationPipe` (whitelist + forbidNonWhitelisted)
- **Env validation** — startup throws with a clear message if required vars are missing

### Mobile (Flutter / React Native / any HTTP client)
- **Bearer token auth** — `Authorization: Bearer <token>` alongside cookie flow
- **Token refresh** — silent access-token renewal via better-auth bearer plugin
- **Device token registration** — `POST /v1/api/users/me/device-tokens` (FCM / APNs)
- **Profile avatar upload** — `POST /v1/api/users/me/avatar` (multipart/form-data, 5 MB max)
- **Deep link callback allowlist** — `ALLOWED_CALLBACK_SCHEMES` env var for `myapp://` schemes
- **API versioning** — `/v1/` URI prefix; `defaultVersion` keeps `/api/...` backward-compatible

### Developer Experience
- **Consistent errors** — global exception filter returns `{ statusCode, message, error, timestamp }`
- **Structured logging** — Fastify Pino wired into NestJS Logger; request IDs in every log line
- **Request logging** — `[METHOD] /path → status in Xms [req-id]` for every route
- **Health check** — `GET /health` with live PostgreSQL connectivity probe
- **OpenAPI docs** — Swagger UI at `/docs` with per-endpoint schemas, cookie + Bearer auth
- **TypeScript path aliases** — `@common/*`, `@auth/*`, `@config/*`, `@db/*`, `@users/*`
- **Typed ConfigService** — `AppConfigService` wraps `ConfigService` with typed getters
- **Graceful shutdown** — `enableShutdownHooks()` drains in-flight requests on SIGTERM
- **Docker support** — multi-stage `Dockerfile`; `docker-compose.yml` includes Postgres + Redis + Mailpit
- **Unit + E2E tests** — filter, interceptor, validator, and health endpoint covered

---

## Project Structure

```
src/
├── auth/
│   ├── controllers/
│   │   ├── identity.controller.ts      # sign-up, sign-in (+ lockout), sign-out, session
│   │   ├── password.controller.ts      # forget-password, reset-password, change-password
│   │   ├── verification.controller.ts  # verify-email, send-verification-email
│   │   ├── oauth.controller.ts         # sign-in/social, callback/:provider (VERSION_NEUTRAL)
│   │   └── user.controller.ts          # GET /v1/api/users/me
│   ├── dto/                            # Request DTOs with class-validator + @ApiProperty
│   ├── responses/                      # AuthResponse, SessionResponse, UserResponse
│   ├── utils/
│   │   └── auth-handler.util.ts        # DTO → auth.handler() → forward response + cookies
│   ├── auth.config.ts                  # better-auth config (bearer, twoFactor, Google, Apple)
│   ├── auth.module.ts
│   ├── email.service.ts                # nodemailer SMTP sender
│   ├── lockout.service.ts              # Account lockout (S2)
│   └── password.service.ts             # bcrypt hash / verify helpers
├── audit/
│   ├── audit.service.ts                # AuditService — records auth events to DB
│   └── audit.module.ts
├── cache/
│   └── cache.module.ts                 # Redis-backed session cache (falls back to in-memory)
├── common/
│   ├── decorators/
│   │   └── current-user.decorator.ts
│   ├── filters/
│   │   └── http-exception.filter.ts    # global { statusCode, message, error, timestamp }
│   ├── guards/
│   │   └── auth.guard.ts               # cookie + Bearer; Redis session cache
│   ├── interceptors/
│   │   └── logging.interceptor.ts      # [METHOD] /path → status in Xms
│   ├── logger/
│   │   └── pino-logger.service.ts      # Fastify Pino → NestJS LoggerService bridge
│   └── utils/
│       └── callback-url.util.ts        # assertCallbackUrl / isCallbackUrlSafe
├── config/
│   ├── app-config.service.ts           # Typed ConfigService wrapper
│   ├── config.module.ts
│   └── env.config.ts                   # Startup validation (DATABASE_URL, BETTER_AUTH_URL, CORS)
├── db/
│   ├── index.ts                        # Drizzle + pg Pool
│   └── schema.ts                       # users, sessions, accounts, verifications, twoFactor,
│                                       # auditLog, loginAttempt, accountLockout, deviceToken
├── email/
│   ├── email.processor.ts              # BullMQ worker (SMTP sender)
│   ├── email-queue.service.ts          # Enqueue email jobs
│   └── email.module.ts                 # BullMQ module (requires REDIS_URL)
├── health/
│   ├── drizzle-health.indicator.ts     # SELECT 1 liveness probe
│   ├── health.controller.ts            # GET /health (VERSION_NEUTRAL)
│   └── health.module.ts
├── users/
│   ├── dto/
│   │   └── device-token.dto.ts
│   ├── device-token.controller.ts      # POST/DELETE /v1/api/users/me/device-tokens
│   ├── upload.controller.ts            # POST /v1/api/users/me/avatar
│   ├── user.module.ts
│   └── user.service.ts                 # findById, updateProfile
├── app.module.ts
└── main.ts                             # Fastify bootstrap + plugins + versioning
```

### Controller design

Every explicit controller method validates input via DTOs, then delegates to better-auth's internal handler through the shared `callAuthHandler` utility:

- `ValidationPipe` rejects invalid input before it ever reaches better-auth
- better-auth owns the actual auth logic — password hashing, session creation, email hooks
- `Set-Cookie` and all response headers (including Bearer tokens) are forwarded automatically
- Each endpoint is documented in Swagger with typed request/response schemas and auth requirements

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- Docker (for PostgreSQL + Redis + Mailpit)

### 1. Clone and install

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Minimum values for local development:

```env
BETTER_AUTH_SECRET=any-random-string-32-chars-minimum
COOKIE_SECRET=any-random-string-32-chars-minimum
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nest_better_auth
BETTER_AUTH_URL=http://localhost:5555
```

### 3. Start infrastructure

```bash
docker compose up -d
```

Starts:
- **PostgreSQL** on `localhost:5432`
- **Redis** on `localhost:6379`
- **Mailpit** SMTP trap on `localhost:1025` (UI at `http://localhost:8025`)

### 4. Push the database schema

```bash
# Development (no migration files):
pnpm db:push

# Production-style (versioned migration files — recommended):
pnpm db:generate && pnpm db:migrate
```

### 5. Start the dev server

```bash
pnpm start:dev
```

| URL | Purpose |
|---|---|
| `http://localhost:5555` | API |
| `http://localhost:5555/docs` | Swagger UI |
| `http://localhost:8025` | Mailpit email inbox |

---

## API Reference

All routes are available at both `/v1/api/...` (explicit version) and `/api/...` (backward-compatible default).

### Identity — `@ApiTags('Identity')`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/sign-up` | — | Register with email + password |
| `POST` | `/api/auth/sign-in` | — | Sign in; returns cookie (web) or Bearer token (mobile with `?token=true`) |
| `POST` | `/api/auth/sign-out` | Cookie / Bearer | Invalidate session |
| `GET` | `/api/auth/session` | Cookie / Bearer | Get current session + user |

### Password — `@ApiTags('Password')`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/forget-password` | — | Send password-reset email |
| `POST` | `/api/auth/reset-password` | — | Reset password with token from email |
| `POST` | `/api/auth/change-password` | Cookie / Bearer | Change password (verifies current first) |

### Verification — `@ApiTags('Verification')`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/verify-email` | — | Verify email with token from inbox |
| `POST` | `/api/auth/send-verification-email` | Cookie / Bearer | Re-send the verification email |

### OAuth — `@ApiTags('OAuth')`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/auth/sign-in/social?provider=google` | — | Redirect to Google consent screen |
| `GET` | `/api/auth/sign-in/social?provider=apple` | — | Redirect to Apple Sign-In |
| `GET` | `/api/auth/callback/:provider` | — | OAuth callback (called by provider) |

### Two-Factor Auth (via better-auth catch-all)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/two-factor/enable` | Cookie / Bearer | Enable TOTP; returns QR code URI |
| `POST` | `/api/auth/two-factor/disable` | Cookie / Bearer | Disable TOTP |
| `POST` | `/api/auth/two-factor/verify-totp` | Cookie / Bearer | Verify TOTP code on sign-in |

### User — `@ApiTags('User')`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/users/me` | Cookie / Bearer | Get authenticated user profile |
| `POST` | `/api/users/me/avatar` | Cookie / Bearer | Upload profile picture (multipart, 5 MB) |
| `POST` | `/api/users/me/device-tokens` | Cookie / Bearer | Register push notification token |
| `DELETE` | `/api/users/me/device-tokens/:id` | Cookie / Bearer | Remove a device token |

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | PostgreSQL liveness check |

---

## Mobile Client Integration

Add `?token=true` to the sign-in request to receive a Bearer token instead of a cookie:

```
POST /api/auth/sign-in?token=true
{ "email": "...", "password": "..." }
→ { "token": "bat_...", "user": { ... } }
```

Use the token in subsequent requests:

```
Authorization: Bearer bat_...
```

To receive a refreshed token:

```
POST /api/auth/token/refresh
Authorization: Bearer bat_...
```

For deep-link OAuth callbacks (e.g. `myapp://auth/callback`), add the scheme to `.env`:

```env
ALLOWED_CALLBACK_SCHEMES=myapp
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5555` | HTTP port |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `BETTER_AUTH_URL` | **Yes** | — | Public base URL of this API |
| `BETTER_AUTH_SECRET` | **Yes** | — | Secret for better-auth token signing |
| `COOKIE_SECRET` | Prod only | — | Secret for cookie signing (throws in production if unset) |
| `CORS_ORIGINS` | No | `http://localhost:5173,...` | Comma-separated allowed origins; `*` blocked in production |
| `ALLOWED_CALLBACK_SCHEMES` | No | — | Comma-separated custom URI schemes for OAuth deep links |
| `GOOGLE_CLIENT_ID` | No | — | Enables Google OAuth when set alongside secret |
| `GOOGLE_CLIENT_SECRET` | No | — | Enables Google OAuth when set alongside ID |
| `APPLE_CLIENT_ID` | No | — | Enables Apple Sign-In when set alongside secret |
| `APPLE_CLIENT_SECRET` | No | — | Enables Apple Sign-In when set alongside ID |
| `REDIS_URL` | No | — | Redis connection string; enables session cache + email queue |
| `SMTP_HOST` | No | `localhost` | SMTP server hostname |
| `SMTP_PORT` | No | `1025` | SMTP server port |
| `SMTP_FROM` | No | `noreply@localhost` | From address for outgoing emails |
| `SMTP_USER` | No | — | SMTP auth username (leave blank for Mailpit) |
| `SMTP_PASS` | No | — | SMTP auth password |

---

## Google OAuth Setup

1. Open [Google Cloud Console](https://console.cloud.google.com) and create a project
2. Navigate to **APIs & Services → Credentials**
3. Create an **OAuth 2.0 Client ID** (application type: Web)
4. Add an authorized redirect URI: `{BETTER_AUTH_URL}/api/auth/callback/google`
5. Add to `.env`:
   ```env
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

The Google provider activates on next restart — no code changes required.

---

## Protecting Your Own Routes

Apply `AuthGuard` at the class or method level and use `@CurrentUser()` to access the authenticated user. Works for both cookie (web) and Bearer token (mobile) requests:

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Posts')
@ApiCookieAuth('better-auth.session_token')
@ApiBearerAuth('bearer-token')
@UseGuards(AuthGuard)
@Controller({ version: '1', path: 'api/posts' })
export class PostsController {
  @Get()
  listPosts(@CurrentUser() user: { id: string; email: string }) {
    return { userId: user.id };
  }
}
```

Register the controller in the relevant module and it is ready to use.

---

## Redis (Session Cache + Email Queue)

Redis is **optional** — the app starts without it.

| Without Redis | With Redis |
|---|---|
| Session validated against DB on every request | Session cached for 4 min — near-zero DB overhead on protected routes |
| Emails sent synchronously (SMTP blocks the request) | Emails dispatched to BullMQ queue — request returns immediately |

To enable, set `REDIS_URL=redis://localhost:6379` in `.env` and uncomment `EmailModule` in `app.module.ts`.

---

## Database Commands

```bash
pnpm db:generate   # generate migration files from schema changes
pnpm db:migrate    # apply pending migrations
pnpm db:push       # push schema directly (dev only — skips migration files)
pnpm db:studio     # open Drizzle Studio (visual DB browser)
pnpm db:check      # check for schema drift
```

---

## Development Scripts

```bash
pnpm start:dev     # watch mode
pnpm start:debug   # watch mode with Node.js debugger attached
pnpm build         # compile TypeScript to /dist
pnpm start:prod    # run compiled output
pnpm lint          # ESLint --fix
pnpm format        # Prettier --write
pnpm test          # unit tests
pnpm test:e2e      # end-to-end tests
pnpm test:cov      # coverage report
```

---

## Docker

Build and run the application container:

```bash
docker build -t nest-better-auth .
docker run -p 5555:5555 --env-file .env nest-better-auth
```

Or use `docker compose up` (starts app + postgres + redis + mailpit together once a service is added to `docker-compose.yml`).

---

## License

MIT
