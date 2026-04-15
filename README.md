# NestJS Better-Auth API Starter

A production-ready NestJS API starter with a complete authentication system powered by [better-auth](https://better-auth.com). Built on Fastify for performance, Drizzle ORM for type-safe database access, and PostgreSQL for persistence.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 11 + Fastify |
| Auth | better-auth 1.6 |
| ORM | Drizzle ORM |
| Database | PostgreSQL 16 |
| Validation | class-validator + class-transformer |
| Rate limiting | @nestjs/throttler |
| API docs | Swagger / OpenAPI (`/docs`) |
| Email (dev) | Mailpit (SMTP trap) |
| Runtime | Node.js 20+ / pnpm |

---

## Features

- **Email + password auth** — sign-up, sign-in, sign-out
- **Email verification** — required before sign-in; re-sendable via authenticated endpoint
- **Password reset** — forget-password / reset-password flow via email token
- **Password change** — authenticated endpoint that verifies the current password first
- **Google OAuth** — optional; activates automatically when env vars are set
- **Session management** — cookie-based sessions managed by better-auth
- **Protected routes** — `AuthGuard` + `@CurrentUser()` decorator
- **Rate limiting** — 100 req/min globally; 20 req/min on auth; 10 req/min on password endpoints
- **CORS** — configurable per-environment via `CORS_ORIGINS`
- **Input validation** — global `ValidationPipe` (whitelist + forbidNonWhitelisted)
- **Consistent errors** — global exception filter returns `{ statusCode, message, error, timestamp }`
- **Health check** — `GET /health` with live PostgreSQL connectivity probe
- **Env validation** — startup throws with a clear message if required vars are missing
- **OpenAPI docs** — Swagger UI at `/docs` with per-endpoint schemas and response types

---

## Project Structure

```
src/
├── auth/
│   ├── controllers/
│   │   ├── identity.controller.ts      # sign-up, sign-in, sign-out, get-session
│   │   ├── password.controller.ts      # forget-password, reset-password, change-password
│   │   ├── verification.controller.ts  # verify-email, send-verification-email
│   │   ├── oauth.controller.ts         # sign-in/social, callback/:provider, internal catch-all
│   │   └── user.controller.ts          # GET /api/users/me
│   ├── dto/
│   │   ├── sign-up.dto.ts
│   │   ├── sign-in.dto.ts
│   │   ├── forget-password.dto.ts
│   │   ├── reset-password.dto.ts
│   │   ├── verify-email.dto.ts
│   │   └── change-password.dto.ts
│   ├── responses/
│   │   ├── auth.response.ts            # AuthResponse, SignOutResponse
│   │   ├── session.response.ts         # SessionResponse, SessionObject
│   │   └── user.response.ts            # UserResponse
│   ├── utils/
│   │   └── auth-handler.util.ts        # DTO → auth.handler() → forward response + cookies
│   ├── auth.config.ts                  # better-auth config (email, Google, session)
│   ├── auth.module.ts
│   ├── email.service.ts                # nodemailer SMTP sender
│   └── password.service.ts             # bcrypt hash / verify helpers
├── common/
│   ├── decorators/
│   │   └── current-user.decorator.ts   # @CurrentUser() param decorator
│   ├── filters/
│   │   └── http-exception.filter.ts    # global error response shaper
│   └── guards/
│       └── auth.guard.ts               # session-based route guard
├── config/
│   └── env.config.ts                   # startup env validation
├── db/
│   ├── index.ts                        # Drizzle + pg Pool
│   └── schema.ts                       # users, sessions, accounts, verifications
├── health/
│   ├── drizzle-health.indicator.ts     # SELECT 1 liveness probe
│   ├── health.controller.ts            # GET /health
│   └── health.module.ts
├── app.module.ts                       # ConfigModule, ThrottlerModule, AuthModule, HealthModule
└── main.ts                             # Fastify bootstrap, plugins, global pipes/filters
```

### Controller design

Every explicit controller method validates input via DTOs, then delegates execution to better-auth's internal handler through a shared `callAuthHandler` utility. This means:

- `ValidationPipe` rejects invalid input before it ever reaches better-auth
- better-auth owns the actual auth logic — password hashing, session creation, email hooks
- `Set-Cookie` and all other response headers are forwarded automatically — no manual cookie code
- Each endpoint is individually documented in Swagger with typed request and response schemas

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- Docker (for PostgreSQL + Mailpit)

### 1. Clone and install

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

The minimum values to change for local development:

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
- **Mailpit** SMTP trap on `localhost:1025` (UI at `http://localhost:8025`)

### 4. Push the database schema

```bash
pnpm db:push        # dev shortcut — no migration files
# or for production-style migrations:
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

### Identity — `@ApiTags('Identity')`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/sign-up` | — | Register with email + password |
| `POST` | `/api/auth/sign-in` | — | Sign in, sets session cookie |
| `POST` | `/api/auth/sign-out` | Cookie | Invalidate session, clear cookie |
| `GET` | `/api/auth/session` | Cookie | Get current session + user |

### Password — `@ApiTags('Password')`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/forget-password` | — | Send password-reset email |
| `POST` | `/api/auth/reset-password` | — | Reset password with email token |
| `POST` | `/api/auth/change-password` | Cookie | Change password (verifies current first) |

### Verification — `@ApiTags('Verification')`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/verify-email` | — | Verify email with token from inbox |
| `POST` | `/api/auth/send-verification-email` | Cookie | Re-send the verification email |

### OAuth — `@ApiTags('OAuth')`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/auth/sign-in/social?provider=google` | — | Redirect to Google consent screen |
| `GET` | `/api/auth/callback/google` | — | OAuth callback (called by Google) |

### User — `@ApiTags('User')`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/users/me` | Cookie | Get authenticated user profile |

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | PostgreSQL liveness check |

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
| `CORS_ORIGINS` | No | `http://localhost:5173,...` | Comma-separated list of allowed origins |
| `GOOGLE_CLIENT_ID` | No | — | Enables Google OAuth when set alongside secret |
| `GOOGLE_CLIENT_SECRET` | No | — | Enables Google OAuth when set alongside ID |
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
4. Add an authorized redirect URI:
   ```
   {BETTER_AUTH_URL}/api/auth/callback/google
   ```
   Example: `http://localhost:5555/api/auth/callback/google`
5. Add to `.env`:
   ```env
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

The Google provider activates on next restart — no code changes required.

---

## Protecting Your Own Routes

Apply `AuthGuard` at the class or method level and use `@CurrentUser()` to access the authenticated user:

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Posts')
@ApiCookieAuth('better-auth.session_token')
@UseGuards(AuthGuard)
@Controller('api/posts')
export class PostsController {
  @Get()
  listPosts(@CurrentUser() user: { id: string; email: string }) {
    // user is guaranteed to be present — AuthGuard throws 401 otherwise
    return { userId: user.id };
  }
}
```

Register the new controller in the relevant module and it is ready to use.

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

## License

MIT
