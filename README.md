# NestJS Better-Auth API Starter

A production-ready NestJS API starter with a complete authentication system powered by [better-auth](https://better-auth.com). Built on Fastify for performance, Drizzle ORM for type-safe database access, and PostgreSQL for persistence. Designed to serve web (cookie-based), mobile (Bearer token), and multi-tenant clients from a single codebase.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 11 + Fastify |
| Auth | better-auth 1.6 (email, OAuth, 2FA, magic link, organization) |
| ORM | Drizzle ORM |
| Type safety | drizzle-zod + Zod — schemas generated from table definitions |
| Database | PostgreSQL 16 |
| Cache | Redis 7 + `@nestjs/cache-manager` |
| Queue | BullMQ (async email dispatch) |
| Validation | class-validator + class-transformer |
| Rate limiting | `@nestjs/throttler` |
| API docs | Swagger / OpenAPI (`/docs`) |
| Email (dev) | Mailpit (SMTP trap) |
| Email (templates) | Handlebars + `juice` CSS inlining |
| Storage | `fs` / MinIO / AWS S3 / Cloudflare R2 (swappable via `STORAGE_DRIVER`) |
| Scheduler | `@nestjs/schedule` (cron cleanup jobs) |
| Metrics | Prometheus via `@willsoto/nestjs-prometheus` (`/metrics`) |
| Tracing | OpenTelemetry SDK + OTLP export (opt-in) |
| Log shipping | Pino-Loki (opt-in, requires `LOKI_URL`) |
| Benchmark | autocannon (`pnpm bench`) |
| Runtime | Node.js 24 / pnpm |

---

## Features

### Authentication
- **Email + password** — sign-up, sign-in, sign-out, session
- **Email verification** — required before sign-in; resendable
- **Password reset** — forget-password / reset-password via email token
- **Password change** — verifies current password before updating
- **Two-factor authentication** — TOTP via `twoFactor` plugin; QR code provisioning
- **Magic link** — passwordless email sign-in via `magicLink` plugin
- **Google OAuth** — activates automatically when env vars are set
- **Apple Sign-In** — required by App Store when any social login is offered
- **Bearer tokens** — `Authorization: Bearer <token>` for mobile clients
- **Token refresh** — silent access-token renewal without re-login
- **Account lockout** — locks after 5 failures in 15 min; auto-unlocks after 30 min; lockout-alert email sent

### Authorization
- **`AuthGuard`** — validates cookie or Bearer token; caches session in Redis to skip per-request DB hit
- **`RolesGuard` + `@Roles()`** — RBAC based on `user.role` (`user` / `admin` / `moderator`)
- **`OrganizationGuard`** — reads `X-Organization-Id` header, resolves org, verifies membership, attaches `req.organization`
- **`OrgRolesGuard` + `@OrgRoles()`** — org-scoped role check (`owner` / `admin` / `member`)
- **`@CurrentUser()`** — injects authenticated user into any handler parameter
- **`@CurrentOrganization()`** — injects resolved org from `OrganizationGuard`
- **`@CurrentOrgMember()`** — injects the user's membership record

### Security
- **`@fastify/helmet`** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- **CORS** — configurable per-environment; wildcard `*` blocked in production at startup
- **CSRF protection** — better-auth handles for cookie-based flows
- **Rate limiting** — 100 req/min globally; tightened per-route where needed
- **Request ID** — `X-Request-Id` header on every response for end-to-end correlation
- **Proxy header stripping** — internal `x-forwarded-*` headers scrubbed before forwarding
- **Callback URL allowlist** — `callbackURL` / `redirectTo` validated; custom schemes via `ALLOWED_CALLBACK_SCHEMES`
- **Audit log** — records every auth event (action, userId, IP, user-agent, timestamp) to `audit_logs` table
- **Input validation** — global `ValidationPipe` (whitelist + forbidNonWhitelisted + transform)
- **Env validation** — startup throws immediately if required vars are missing
- **`ClassSerializerInterceptor`** — strips `@Exclude()` fields from responses globally

### Multi-tenancy
- **Organization plugin** — create and manage workspaces via better-auth `organization` plugin
- **`OrganizationGuard`** — reads `X-Organization-Id`, validates membership, scopes requests
- **Member role gating** — `@OrgRoles('owner', 'admin')` restricts org-sensitive operations
- Schema: `organizations`, `members`, `invitations` tables

### Mobile (Flutter / React Native)
- **Bearer token auth** — full session support alongside cookie flow
- **Token refresh** — `POST /api/auth/token/refresh`
- **Device token registration** — `POST /v1/api/users/me/device-tokens` (FCM / APNs)
- **Profile avatar upload** — `multipart/form-data`, 5 MB limit, routed through storage adapter
- **Deep link allowlist** — `ALLOWED_CALLBACK_SCHEMES` for `myapp://` OAuth callbacks
- **API versioning** — `/v1/` URI prefix; `defaultVersion` keeps `/api/...` backward-compatible

### Admin API
- `GET /v1/api/admin/users` — paginated user list (cursor-based, filterable)
- `GET /v1/api/admin/users/stats` — totals: all, banned, deleted, admins
- `GET /v1/api/admin/users/:id` — user detail
- `PATCH /v1/api/admin/users/:id` — update role, ban/unban, force email verify
- `DELETE /v1/api/admin/users/:id` — soft-delete (sets `deletedAt`)
- `GET /v1/api/admin/audit-logs` — paginated audit log, filterable by `?userId=`
- All admin routes require `role = admin` enforced by `RolesGuard`

### Pagination
- **Cursor-based** — `CursorPaginationDto` (`limit`, `cursor`), `CursorPage<T>` response shape
- Applied to: admin user list, audit log list, device token list
- `buildCursorPage()` utility — fetch `limit + 1`, detect `hasNextPage`, return `nextCursor`

### File Storage (swappable adapters)
| Driver | When to use |
|---|---|
| `fs` (default) | Local dev / single-node |
| `minio` | Self-hosted S3-compatible (docker compose) |
| `s3` | AWS S3 |
| `r2` | Cloudflare R2 (same adapter, different endpoint) |

Select with `STORAGE_DRIVER=minio`. All adapters implement the same `StorageService` interface: `upload()`, `delete()`, `getUrl()`.

### Email Templates
- **Handlebars** templates with `juice` CSS inlining (Gmail / Outlook compatible)
- Templates: `welcome`, `email-verification`, `password-reset`, `magic-link`, `lockout-alert`
- `text/plain` fallback generated automatically by stripping HTML tags
- Dev preview: `GET /dev/email/:template` renders any template in the browser

### Observability
- **Prometheus** — `/metrics` endpoint with default Node.js metrics + custom auth event counters and HTTP duration histogram
- **OpenTelemetry** — `src/tracing.ts`; activated by `OTEL_ENABLED=true`; OTLP export to Tempo
- **Pino-Loki** — structured log shipping; activated by setting `LOKI_URL`
- **Bull Board** — `/admin/queues` UI for BullMQ queues (mounted when `REDIS_URL` is set)
- **Correlation IDs** — `X-Request-Id` flows through every log line and trace span

### Scheduled Jobs
- Purge expired sessions older than 30 days — daily at 02:00 UTC
- Purge login attempts older than 90 days — weekly on Sunday at 03:00 UTC
- Purge audit logs older than 1 year — monthly on the 1st at 04:00 UTC
- Log active session count — daily at midnight UTC

### Feature Flags
Every optional feature can be turned on/off without rebuilding. See [Feature Flags](#feature-flags) below.

### Developer Experience
- **`pnpm dev`** — one command: docker compose up → wait for DB → migrate → seed → watch server
- **Consistent errors** — global exception filter returns `{ statusCode, message, error, timestamp }`
- **Structured logging** — Fastify Pino wired into NestJS Logger; request IDs in every log line
- **Request logging** — `[METHOD] /path → status in Xms [req-id]` for every route
- **Health check** — `GET /health` with live PostgreSQL connectivity probe
- **OpenAPI docs** — Swagger UI at `/docs`
- **TypeScript path aliases** — `@common/*`, `@auth/*`, `@config/*`, `@db/*`, `@users/*`
- **Typed `ConfigService`** — `AppConfigService` wraps `ConfigService` with typed getters
- **Graceful shutdown** — `enableShutdownHooks()` drains in-flight requests on SIGTERM
- **Benchmarks** — `pnpm bench` runs autocannon scenarios against health, session, and auth endpoints

---

## Project Structure

```
src/
├── auth/
│   ├── controllers/
│   │   ├── identity.controller.ts      # sign-up, sign-in (+ lockout), sign-out, session
│   │   ├── magic-link.controller.ts    # send-magic-link, verify-magic-link
│   │   ├── password.controller.ts      # forget-password, reset-password, change-password
│   │   ├── verification.controller.ts  # verify-email, send-verification-email
│   │   ├── oauth.controller.ts         # sign-in/social, callback/:provider (VERSION_NEUTRAL)
│   │   └── user.controller.ts          # GET /v1/api/users/me
│   ├── dto/                            # Request DTOs with class-validator + @ApiProperty
│   ├── responses/                      # AuthResponse, SessionResponse, UserResponse
│   ├── utils/
│   │   └── auth-handler.util.ts        # DTO → auth.handler() → forward response + cookies
│   ├── auth.config.ts                  # better-auth config; plugins conditionally loaded via features
│   ├── auth.module.ts
│   ├── email.service.ts                # nodemailer SMTP sender
│   ├── lockout.service.ts              # failed-attempt tracking + lockout enforcement
│   └── password.service.ts             # bcrypt helpers
├── audit/
│   ├── audit.service.ts                # log(), fromRequest(), findAll() (cursor-paginated)
│   └── audit.module.ts
├── cache/
│   └── cache.module.ts                 # Redis-backed cache; falls back to in-memory
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   ├── current-organization.decorator.ts  # @CurrentOrganization(), @CurrentOrgMember()
│   │   ├── roles.decorator.ts                  # @Roles('admin', 'moderator')
│   │   └── org-roles.decorator.ts              # @OrgRoles('owner', 'admin')
│   ├── dto/
│   │   └── pagination.dto.ts           # CursorPaginationDto, CursorPage<T>, buildCursorPage()
│   ├── filters/
│   │   └── http-exception.filter.ts    # { statusCode, message, error, timestamp }
│   ├── guards/
│   │   ├── auth.guard.ts               # cookie + Bearer; Redis session cache
│   │   ├── roles.guard.ts              # checks req.user.role against @Roles()
│   │   ├── organization.guard.ts       # resolves X-Organization-Id → req.organization
│   │   └── org-roles.guard.ts          # checks req.organizationMember.role against @OrgRoles()
│   ├── interceptors/
│   │   └── logging.interceptor.ts
│   ├── logger/
│   │   └── pino-logger.service.ts      # Fastify Pino → NestJS LoggerService bridge
│   ├── utils/
│   │   └── callback-url.util.ts
│   └── index.ts                        # barrel export for all guards, decorators, DTOs
├── config/
│   ├── app-config.service.ts           # typed ConfigService wrapper
│   ├── config.module.ts
│   ├── env.config.ts                   # startup validation
│   ├── features.config.ts              # ← edit here to change feature defaults
│   └── features.ts                     # resolves env overrides → features object
├── db/
│   ├── connection.ts                   # raw pg.Pool + DrizzleDB singleton (no NestJS)
│   ├── drizzle.service.ts              # @Injectable() wrapper; OnModuleDestroy pool drain
│   ├── drizzle.module.ts               # @Global() module — registered once in AppModule
│   ├── schema.ts                       # all table definitions + inferred TS types
│   ├── zod-schemas.ts                  # Zod schemas generated via drizzle-zod
│   └── index.ts                        # barrel: connection, DrizzleService, schema, zod-schemas
├── email/
│   ├── templates/                      # *.hbs — welcome, email-verification, password-reset,
│   │                                   #          magic-link, lockout-alert
│   ├── email-preview.controller.ts     # GET /dev/email/:template (dev only)
│   ├── email-queue.service.ts          # BullMQ enqueue helper
│   ├── email.processor.ts              # BullMQ worker (SMTP sender)
│   ├── email.module.ts                 # BullMQ module (requires REDIS_URL)
│   └── template.service.ts             # renderEmail() — Handlebars + juice CSS inlining
├── health/
│   ├── drizzle-health.indicator.ts
│   ├── health.controller.ts            # GET /health (VERSION_NEUTRAL)
│   └── health.module.ts
├── jobs/
│   ├── cleanup.service.ts              # cron jobs: purge sessions, login attempts, audit logs
│   └── jobs.module.ts
├── metrics/
│   ├── metrics.module.ts               # Prometheus counters + histogram
│   └── metrics.service.ts
├── storage/
│   ├── adapters/
│   │   ├── fs.adapter.ts               # STORAGE_DRIVER=fs
│   │   ├── minio.adapter.ts            # STORAGE_DRIVER=minio
│   │   └── s3.adapter.ts               # STORAGE_DRIVER=s3 or r2
│   ├── storage.interface.ts            # StorageService interface + STORAGE_SERVICE token
│   └── storage.module.ts               # factory — selects adapter from STORAGE_DRIVER
├── users/
│   ├── dto/
│   │   ├── device-token.dto.ts
│   │   └── update-user-admin.dto.ts    # role, ban, unban, forceVerifyEmail
│   ├── admin.controller.ts             # GET/PATCH/DELETE /v1/api/admin/users (admin only)
│   ├── device-token.controller.ts
│   ├── upload.controller.ts            # POST /v1/api/users/me/avatar
│   ├── user.module.ts
│   └── user.service.ts                 # findById, findAll (paginated), ban, updateRole, etc.
├── app.module.ts                       # conditional imports based on features
├── main.ts                             # Fastify bootstrap + conditional Swagger + Bull Board
└── tracing.ts                          # OpenTelemetry — activated by OTEL_ENABLED=true

scripts/
├── dev.sh                              # full dev startup orchestrator
├── prod.sh                             # production build + deploy orchestrator
├── seed.ts                             # idempotent dev seed (users, org, memberships)
└── bench.sh                            # autocannon benchmark scenarios

docker-compose.yml                      # dev: Postgres, Redis, Mailpit, MinIO, Adminer, RedisInsight
docker-compose.observability.yml        # opt-in: Prometheus, Grafana, Loki, Tempo
docker-compose.prod.yml                 # production overrides: restart policies, memory limits, no dev tools
nginx.conf                              # reverse proxy with TLS termination example
```

### Database layer

Two consumers with different needs are satisfied by the same connection:

```
auth.config.ts          scripts/seed.ts
      │                        │
      └──────────┬─────────────┘
                 ▼
      src/db/connection.ts          ← raw pool + db (no NestJS)
                 │
                 ▼
      src/db/drizzle.service.ts     ← @Injectable(); OnModuleDestroy drains pool
                 │
         (injected into)
   UserService, AuditService, LockoutService, CleanupService, …
```

`DrizzleService` is mockable in tests via `TestingModule.overrideProvider(DrizzleService)`. `auth.config.ts` must use the raw import because it runs before NestJS bootstraps.

### Type safety

`src/db/zod-schemas.ts` exports Zod schemas generated directly from Drizzle table definitions via `drizzle-zod`:

```typescript
import { selectUserSchema, insertUserSchema, type SelectUser } from '@db/zod-schemas';

// Validates a raw request body — types match the DB columns exactly
const parsed = insertUserSchema.parse(body);

// Inferred type from SELECT — no manual type duplication
function toResponse(user: SelectUser) { ... }
```

Change a column in `schema.ts` → the Zod schema updates automatically. No drift between DB types and runtime validation.

### Controller design

Every explicit controller validates input via DTOs, then delegates to better-auth's internal handler:

```
Request → ValidationPipe → DTO → callAuthHandler() → better-auth → Response + Set-Cookie
```

- `ValidationPipe` rejects invalid input before it reaches better-auth
- better-auth owns the actual auth logic (hashing, session creation, email hooks)
- `Set-Cookie` and Bearer token headers are forwarded automatically
- Each endpoint is documented in Swagger with typed request/response schemas

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- Docker

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
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nest_better_auth
BETTER_AUTH_URL=http://localhost:5555
BETTER_AUTH_SECRET=any-random-string-at-least-32-chars
COOKIE_SECRET=any-random-string-at-least-32-chars
```

### 3. Start everything

```bash
pnpm dev
```

This single command:
1. Starts Docker services (Postgres, Redis, Mailpit, MinIO)
2. Waits for Postgres to be healthy
3. Runs pending DB migrations
4. Seeds dev data (5 users + sample organization)
5. Starts the NestJS dev server in watch mode

| URL | Purpose |
|---|---|
| `http://localhost:5555` | API |
| `http://localhost:5555/docs` | Swagger UI |
| `http://localhost:5555/health` | Health check |
| `http://localhost:5555/metrics` | Prometheus metrics |
| `http://localhost:5555/dev/email/welcome` | Email template preview |
| `http://localhost:8025` | Mailpit email inbox |
| `http://localhost:8080` | Adminer (DB browser) |
| `http://localhost:5540` | RedisInsight |
| `http://localhost:9001` | MinIO console |

### Seed accounts

| Role | Email | Password |
|---|---|---|
| `admin` | `admin@example.com` | `Admin123!` |
| `moderator` | `moderator@example.com` | `Mod123!` |
| `user` | `alice@example.com` | `Alice123!` |
| `user` | `bob@example.com` | `Bob123!` |
| `user` | `charlie@example.com` | `Charlie123!` |

---

## Feature Flags

Optional features are controlled by a two-layer config:

**Layer 1 — project defaults** (`src/config/features.config.ts`):

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
  emailPreview: true,  // dev only — always off in production
  metrics: true,
  tracing: false,      // opt-in — heavy
  logShipping: false,  // opt-in — requires LOKI_URL
};
```

**Layer 2 — environment override** (wins over defaults):

```env
FEATURE_SWAGGER=false        # disable API docs in staging
FEATURE_TRACING=true         # enable OTel in production
FEATURE_EMAIL_QUEUE=false    # run without Redis in CI
FEATURE_TWO_FACTOR=false     # disable 2FA for a lightweight deployment
```

Env var name: `FEATURE_<SCREAMING_SNAKE_CASE>` of the camelCase key (`emailQueue` → `FEATURE_EMAIL_QUEUE`).

Disabled plugins (e.g. `twoFactor`, `organization`) are not loaded at all — no runtime overhead.

---

## API Reference

All routes are available at both `/v1/api/...` (explicit version) and `/api/...` (backward-compatible default).

### Identity

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/sign-up` | — | Register with email + password |
| `POST` | `/api/auth/sign-in` | — | Sign in; returns cookie (web) or Bearer (`?token=true`) |
| `POST` | `/api/auth/sign-out` | ✓ | Invalidate session |
| `GET` | `/api/auth/session` | ✓ | Get current session + user |

### Password

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/forget-password` | — | Send password-reset email |
| `POST` | `/api/auth/reset-password` | — | Reset password with token from email |
| `POST` | `/api/auth/change-password` | ✓ | Change password (verifies current first) |

### Verification

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/verify-email` | — | Verify email with token from inbox |
| `POST` | `/api/auth/send-verification-email` | ✓ | Re-send the verification email |

### Magic Link *(feature: `magicLink`)*

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/magic-link/send-magic-link` | — | Send a sign-in link to email (5 req/15 min) |
| `GET` | `/api/auth/magic-link/verify-magic-link?token=` | — | Verify link and create session |

### Two-Factor Auth *(feature: `twoFactor`)*

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/two-factor/enable` | ✓ | Enable TOTP; returns QR code URI |
| `POST` | `/api/auth/two-factor/disable` | ✓ | Disable TOTP |
| `POST` | `/api/auth/two-factor/verify-totp` | ✓ | Verify TOTP code on sign-in |

### OAuth *(feature: `socialAuth`)*

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/auth/sign-in/social?provider=google` | — | Redirect to Google consent |
| `GET` | `/api/auth/sign-in/social?provider=apple` | — | Redirect to Apple Sign-In |
| `GET` | `/api/auth/callback/:provider` | — | OAuth callback |

### Token (Bearer)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/token` | — | Exchange credentials for Bearer token |
| `POST` | `/api/auth/token/refresh` | Bearer | Refresh an expiring access token |

### User

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/users/me` | ✓ | Get authenticated user profile |
| `POST` | `/api/users/me/avatar` | ✓ | Upload profile picture (multipart, 5 MB) |
| `POST` | `/api/users/me/device-tokens` | ✓ | Register push notification token |
| `DELETE` | `/api/users/me/device-tokens/:id` | ✓ | Remove a device token |

### Admin *(requires `role = admin`)*

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/users/stats` | Totals: all, banned, deleted, admins |
| `GET` | `/api/admin/users` | Paginated user list (`?limit=&cursor=`) |
| `GET` | `/api/admin/users/:id` | User detail |
| `PATCH` | `/api/admin/users/:id` | Update role, ban/unban, force email verify |
| `DELETE` | `/api/admin/users/:id` | Soft-delete (sets `deletedAt`) |
| `GET` | `/api/admin/audit-logs` | Paginated audit log (`?userId=&limit=&cursor=`) |

### Organization *(feature: `organization`)*

Managed by the better-auth organization plugin catch-all. See [better-auth organization docs](https://www.better-auth.com/docs/plugins/organization) for the full endpoint list. All requests require `X-Organization-Id` header when using `OrganizationGuard`.

### Health / Observability

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | PostgreSQL liveness check |
| `GET` | `/metrics` | Prometheus metrics |
| `GET` | `/dev/email/:template` | Email template preview (dev only) |
| `GET` | `/admin/queues` | Bull Board queue UI (requires Redis) |

---

## Protecting Your Own Routes

### Basic auth guard

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser } from '../common';

@UseGuards(AuthGuard)
@Controller({ version: '1', path: 'api/posts' })
export class PostsController {
  @Get()
  list(@CurrentUser() user: { id: string; email: string; role: string }) {
    return { userId: user.id };
  }
}
```

### Role-based access

```typescript
import { AuthGuard, RolesGuard, Roles, CurrentUser } from '../common';

@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
@Controller({ version: '1', path: 'api/admin/reports' })
export class ReportsController { ... }
```

### Organization-scoped routes

```typescript
import { AuthGuard, OrganizationGuard, OrgRolesGuard, OrgRoles, CurrentOrganization, CurrentOrgMember } from '../common';
import type { Organization, Member } from '../db/schema';

@UseGuards(AuthGuard, OrganizationGuard)
@Controller({ version: '1', path: 'api/projects' })
export class ProjectsController {
  @Get()
  list(@CurrentOrganization() org: Organization) {
    return this.projectsService.findAll(org.id);
  }

  @Delete(':id')
  @UseGuards(OrgRolesGuard)
  @OrgRoles('owner', 'admin')
  remove(
    @CurrentOrganization() org: Organization,
    @Param('id') id: string,
  ) {
    return this.projectsService.remove(org.id, id);
  }
}
```

The client sends `X-Organization-Id: <org-id>` with every request. The guard resolves the org and verifies membership before the handler runs.

### Using DrizzleService in a custom service

```typescript
import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { user } from '../db/schema';

@Injectable()
export class PostsService {
  constructor(private readonly drizzle: DrizzleService) {}

  async findByUser(userId: string) {
    return this.drizzle.db.query.user.findFirst({ where: eq(user.id, userId) });
  }
}
```

---

## Mobile Client Integration

Add `?token=true` to sign-in to receive a Bearer token:

```http
POST /api/auth/sign-in?token=true
Content-Type: application/json

{ "email": "alice@example.com", "password": "Alice123!" }
```

```json
{ "token": "bat_...", "user": { ... } }
```

Use in subsequent requests:

```http
GET /api/auth/session
Authorization: Bearer bat_...
```

Refresh before expiry:

```http
POST /api/auth/token/refresh
Authorization: Bearer bat_...
```

For deep-link OAuth callbacks, add the custom scheme:

```env
ALLOWED_CALLBACK_SCHEMES=myapp
```

---

## Docker

### Development stack

```bash
pnpm infra:up          # start all dev services
pnpm infra:down        # stop
pnpm infra:reset       # stop + delete volumes (fresh state)
pnpm infra:logs        # tail all logs
```

Services started by `docker-compose.yml`:
- PostgreSQL 16 — port 5432
- Redis 7 — port 6379
- Mailpit — SMTP 1025, UI 8025
- MinIO — API 9000, console 9001
- Adminer — port 8080
- RedisInsight — port 5540

### Observability stack (opt-in)

```bash
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d
```

Adds: Prometheus (9090), Grafana (3100, admin/admin), Loki (3101), Tempo (3200).

### Production stack

```bash
pnpm prod
# or with options:
SKIP_BUILD=true pnpm prod        # skip Docker build (image already exists)
SKIP_MIGRATE=true pnpm prod      # skip migration
```

Uses `docker-compose.prod.yml` — adds the `api` service with health checks, memory limits, `restart: always`, and disables dev tools (Mailpit, Adminer, RedisInsight).

---

## File Storage

Set `STORAGE_DRIVER` to select the adapter:

```env
# Local filesystem (default, dev only)
STORAGE_DRIVER=fs

# MinIO (self-hosted S3, docker compose)
STORAGE_DRIVER=minio
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=uploads

# AWS S3
STORAGE_DRIVER=s3
AWS_REGION=us-east-1
AWS_BUCKET=my-bucket
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# Cloudflare R2
STORAGE_DRIVER=r2
R2_ACCOUNT_ID=...
R2_BUCKET=my-bucket
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
```

All adapters expose the same interface — swap the driver without changing any application code.

---

## Observability

### Prometheus + Grafana

```bash
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d
```

Grafana at `http://localhost:3100` (admin/admin). Prometheus, Loki, and Tempo data sources are pre-provisioned.

### OpenTelemetry tracing

```env
FEATURE_TRACING=true
OTEL_ENABLED=true
OTEL_SERVICE_NAME=nest-better-auth
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

### Loki log shipping

```env
FEATURE_LOG_SHIPPING=true
LOKI_URL=http://localhost:3101
```

---

## Benchmarking

```bash
# All scenarios (health, session, sign-in, sign-in-bad)
pnpm bench

# Specific scenario
pnpm bench:health
pnpm bench:auth

# Quick 5-second baseline
pnpm bench:quick

# Custom load
CONNECTIONS=100 DURATION=30 BASE_URL=https://api.example.com pnpm bench
```

Uses [autocannon](https://github.com/mcollina/autocannon). Scenarios:
- `health` — `GET /health` (baseline, no auth)
- `session` — `GET /v1/api/auth/session` (auth guard fast path, expect 401)
- `sign-in` — `POST /v1/api/auth/sign-in` with seeded credentials
- `sign-in-bad` — wrong password (tests lockout code path)

---

## Database Commands

```bash
pnpm db:generate   # generate migration files from schema changes
pnpm db:migrate    # apply pending migrations
pnpm db:push       # push schema directly (dev only — skips migration files)
pnpm db:seed       # populate with dev data (idempotent)
pnpm db:studio     # open Drizzle Studio
pnpm db:check      # check for schema drift
```

---

## All Scripts

```bash
# ── Dev lifecycle ──────────────────────────────────────────────────────────
pnpm dev               # infra up → migrate → seed → start:dev
pnpm dev:no-seed       # same but skip seed (after first run)
pnpm dev:no-infra      # skip infra + seed (infra already running)

# ── Production ─────────────────────────────────────────────────────────────
pnpm prod              # build image → prod compose → migrate → start API
pnpm prod:no-build     # skip Docker build

# ── Infrastructure ─────────────────────────────────────────────────────────
pnpm infra:up          # docker compose up -d
pnpm infra:up:core     # postgres + redis + mailpit only
pnpm infra:down        # docker compose down
pnpm infra:reset       # down + delete volumes
pnpm infra:logs        # tail logs
pnpm infra:ps          # show service status

# ── Server ─────────────────────────────────────────────────────────────────
pnpm start:dev         # watch mode
pnpm start:debug       # watch mode + debugger
pnpm start:prod        # run compiled dist/main
pnpm build             # compile to /dist

# ── Tests ──────────────────────────────────────────────────────────────────
pnpm test              # unit tests
pnpm test:watch        # watch mode
pnpm test:cov          # coverage report
pnpm test:e2e          # end-to-end tests

# ── Benchmarks ─────────────────────────────────────────────────────────────
pnpm bench             # all scenarios
pnpm bench:health      # health endpoint only
pnpm bench:auth        # sign-in flow only
pnpm bench:quick       # 10 conn × 5s against /health

# ── Code quality ───────────────────────────────────────────────────────────
pnpm format            # prettier --write
```

---

## Environment Variables

### Core

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5555` | HTTP listen port |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `DB_POOL_MAX` | No | `10` | Max database pool connections |
| `BETTER_AUTH_URL` | **Yes** | — | Public base URL of this API |
| `BETTER_AUTH_SECRET` | **Yes** | — | Secret for token signing (≥32 chars) |
| `COOKIE_SECRET` | Prod only | — | Secret for cookie signing; required in production |
| `CORS_ORIGINS` | No | `http://localhost:5173,...` | Comma-separated allowed origins; `*` blocked in production |
| `ALLOWED_CALLBACK_SCHEMES` | No | — | Comma-separated custom URI schemes for OAuth deep links |
| `APP_NAME` | No | `NestJS Better-Auth` | Shown in email templates |

### Social Auth *(feature: `socialAuth`)*

| Variable | Description |
|---|---|
| `GOOGLE_CLIENT_ID` | Enables Google OAuth when set with secret |
| `GOOGLE_CLIENT_SECRET` | |
| `APPLE_CLIENT_ID` | Enables Apple Sign-In when set with secret |
| `APPLE_CLIENT_SECRET` | |

### Email (SMTP)

| Variable | Default | Description |
|---|---|---|
| `SMTP_HOST` | `localhost` | SMTP server hostname |
| `SMTP_PORT` | `1025` | SMTP server port |
| `SMTP_FROM` | `noreply@localhost` | From address |
| `SMTP_USER` | — | SMTP auth username |
| `SMTP_PASS` | — | SMTP auth password |

### Redis

| Variable | Description |
|---|---|
| `REDIS_URL` | e.g. `redis://localhost:6379`; enables session cache + BullMQ |

### File Storage *(feature: `storage`)*

| Variable | Description |
|---|---|
| `STORAGE_DRIVER` | `fs` (default) \| `minio` \| `s3` \| `r2` |
| `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`, `MINIO_PUBLIC_URL` | MinIO config |
| `AWS_REGION`, `AWS_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_PUBLIC_URL` | S3 config |
| `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_URL` | R2 config |

### Observability

| Variable | Default | Description |
|---|---|---|
| `LOKI_URL` | — | Ship logs to Loki (requires `FEATURE_LOG_SHIPPING=true`) |
| `OTEL_ENABLED` | `false` | Activate OpenTelemetry tracing (requires `FEATURE_TRACING=true`) |
| `OTEL_SERVICE_NAME` | `nest-better-auth` | Service name in traces |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | OTLP HTTP exporter URL |

### Feature Flags

All default to the values in `src/config/features.config.ts`. Set to `false` or `0` to disable.

| Variable | Default | Controls |
|---|---|---|
| `FEATURE_REDIS` | `true` | Redis session cache + BullMQ |
| `FEATURE_EMAIL_QUEUE` | `true` | Async email via BullMQ |
| `FEATURE_TWO_FACTOR` | `true` | TOTP 2FA plugin |
| `FEATURE_MAGIC_LINK` | `true` | Magic link plugin |
| `FEATURE_ORGANIZATION` | `true` | Organization plugin |
| `FEATURE_SOCIAL_AUTH` | `true` | Google / Apple OAuth |
| `FEATURE_SWAGGER` | `true` | API docs at `/docs` |
| `FEATURE_RATE_LIMITING` | `true` | Throttler guard |
| `FEATURE_AUDIT_LOG` | `true` | Auth event audit trail |
| `FEATURE_SCHEDULER` | `true` | Cleanup cron jobs |
| `FEATURE_EMAIL_PREVIEW` | `true` | `/dev/email` preview route (dev only) |
| `FEATURE_METRICS` | `true` | Prometheus `/metrics` |
| `FEATURE_TRACING` | `false` | OpenTelemetry (opt-in) |
| `FEATURE_LOG_SHIPPING` | `false` | Pino-Loki (opt-in) |

---

## License

MIT
