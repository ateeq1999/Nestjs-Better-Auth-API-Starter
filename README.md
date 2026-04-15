# NestJS Better-Auth API Starter

A production-ready NestJS API starter with a full authentication system powered by [better-auth](https://better-auth.com). Built on Fastify for performance, Drizzle ORM for type-safe database access, and PostgreSQL for persistence.

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
- **Email verification** — required before sign-in; re-sendable
- **Password reset** — forget-password / reset-password flow via email
- **Google OAuth** — optional; enabled automatically when env vars are set
- **Session management** — cookie-based sessions via better-auth
- **Protected routes** — `AuthGuard` + `@CurrentUser()` decorator
- **Rate limiting** — 100 req/min globally, 20 req/min on auth endpoints
- **CORS** — configurable per-environment via `CORS_ORIGINS`
- **Input validation** — global `ValidationPipe` with whitelist enforcement
- **Consistent error shape** — global exception filter (`{ statusCode, message, error, timestamp }`)
- **Health check** — `GET /health` with live DB connectivity check
- **Env validation** — app throws with a clear message on startup if required vars are missing
- **OpenAPI docs** — auto-generated Swagger UI at `/docs`

---

## Project Structure

```
src/
├── auth/
│   ├── dto/
│   │   └── change-password.dto.ts
│   ├── auth.config.ts        # better-auth configuration (email, Google, session)
│   ├── auth.controller.ts    # catch-all → delegates all /api/auth/* to auth.handler()
│   ├── auth.module.ts
│   ├── email.service.ts      # nodemailer SMTP sender
│   ├── password.service.ts   # bcrypt hash / verify helpers
│   └── user.controller.ts    # GET /api/users/me, POST /api/users/change-password
├── common/
│   ├── decorators/
│   │   └── current-user.decorator.ts   # @CurrentUser() param decorator
│   ├── filters/
│   │   └── http-exception.filter.ts    # global error response shaper
│   └── guards/
│       └── auth.guard.ts               # session-based AuthGuard
├── config/
│   └── env.config.ts         # startup env validation
├── db/
│   ├── index.ts              # Drizzle + pg Pool setup
│   └── schema.ts             # users, sessions, accounts, verifications tables
├── health/
│   ├── drizzle-health.indicator.ts   # SELECT 1 liveness probe
│   ├── health.controller.ts          # GET /health
│   └── health.module.ts
├── app.module.ts             # ConfigModule, ThrottlerModule, AuthModule, HealthModule
└── main.ts                   # Fastify bootstrap, plugins, global pipes/filters
```

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

Edit `.env` — the only values you **must** change for local dev are the secrets:

```env
BETTER_AUTH_SECRET=any-random-string-32-chars-minimum
COOKIE_SECRET=any-random-string-32-chars-minimum
```

### 3. Start infrastructure

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** on `localhost:5432`
- **Mailpit** SMTP trap on `localhost:1025` (UI at `http://localhost:8025`)

### 4. Run migrations

```bash
pnpm db:push        # push schema to DB (dev shortcut)
# or
pnpm db:generate    # generate migration files
pnpm db:migrate     # apply migrations
```

### 5. Start the server

```bash
pnpm start:dev
```

| URL | Purpose |
|---|---|
| `http://localhost:5555` | API |
| `http://localhost:5555/docs` | Swagger UI |
| `http://localhost:8025` | Mailpit (dev email inbox) |

---

## API Reference

All auth routes are delegated to better-auth's handler. The full list is visible in the Swagger UI at `/docs`.

### Auth (`/api/auth/*`)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/sign-up/email` | Register with email + password |
| `POST` | `/api/auth/sign-in/email` | Sign in, sets session cookie |
| `POST` | `/api/auth/sign-out` | Invalidate session |
| `GET` | `/api/auth/get-session` | Returns current session + user |
| `POST` | `/api/auth/verify-email` | Verify email with token from inbox |
| `POST` | `/api/auth/forget-password` | Send password-reset email |
| `POST` | `/api/auth/reset-password` | Reset password with token |
| `GET` | `/api/auth/sign-in/social?provider=google` | Initiate Google OAuth (if configured) |
| `GET` | `/api/auth/callback/google` | Google OAuth callback |

### Users (`/api/users/*`)

> All routes require an active session (cookie).

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/users/me` | Get the authenticated user's profile |
| `POST` | `/api/users/change-password` | Change password (verifies current first) |

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Returns DB liveness status |

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5555` | HTTP port |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `BETTER_AUTH_URL` | **Yes** | — | Public base URL of this API |
| `BETTER_AUTH_SECRET` | **Yes** | — | Secret for better-auth token signing |
| `COOKIE_SECRET` | Prod only | — | Secret for cookie signing (required in production) |
| `CORS_ORIGINS` | No | `http://localhost:5173,...` | Comma-separated allowed origins |
| `GOOGLE_CLIENT_ID` | No | — | Enables Google OAuth when set with secret |
| `GOOGLE_CLIENT_SECRET` | No | — | Enables Google OAuth when set with ID |
| `SMTP_HOST` | No | `localhost` | SMTP server host |
| `SMTP_PORT` | No | `1025` | SMTP server port |
| `SMTP_FROM` | No | `noreply@localhost` | From address for outgoing emails |
| `SMTP_USER` | No | — | SMTP auth username (blank for Mailpit) |
| `SMTP_PASS` | No | — | SMTP auth password |

---

## Google OAuth Setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable the **Google+ API** (or **Google Identity**)
3. Create an OAuth 2.0 Client ID (Web application)
4. Add an authorized redirect URI:
   ```
   {BETTER_AUTH_URL}/api/auth/callback/google
   ```
5. Add to `.env`:
   ```env
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

The Google provider activates automatically on next restart — no code changes needed.

---

## Protecting Routes

Use `AuthGuard` and `@CurrentUser()` in any controller:

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/posts')
@UseGuards(AuthGuard)
export class PostsController {
  @Get()
  listPosts(@CurrentUser() user: { id: string; email: string }) {
    // user is guaranteed to be authenticated here
  }
}
```

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
pnpm start:debug   # watch mode with debugger
pnpm build         # compile to /dist
pnpm start:prod    # run compiled output
pnpm lint          # ESLint --fix
pnpm format        # Prettier --write
pnpm test          # unit tests
pnpm test:e2e      # end-to-end tests
pnpm test:cov      # test coverage report
```

---

## License

MIT
