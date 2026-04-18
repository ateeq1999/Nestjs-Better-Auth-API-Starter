# NestJS Better-Auth API Starter

A production-ready NestJS API starter with complete authentication powered by [Better Auth](https://better-auth.com). Built for web (cookie-based), mobile (Bearer token), and multi-tenant applications.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)

## Features

### Authentication

- **Email + Password** - Sign-up, sign-in, sign-out with session management
- **Email Verification** - Required before sign-in; resendable
- **Password Reset** - Forget-password / reset-password via email token
- **Two-Factor Authentication** - TOTP via authenticator apps
- **Magic Link** - Passwordless email sign-in
- **OAuth / Social Login** - Google, Apple, and custom OAuth providers
- **Bearer Tokens** - Mobile-friendly token authentication
- **Account Lockout** - Automatic lockout after failed attempts

### Authorization

- **RBAC** - Role-based access control (user, admin, moderator)
- **Organization Support** - Multi-tenant workspaces with member roles
- **Session Management** - Redis-cached sessions for performance

### Security

- **Rate Limiting** - Global and per-route throttling
- **CSRF Protection** - Built-in via Better Auth
- **Security Headers** - CSP, HSTS, X-Frame-Options via `@fastify/helmet`
- **Input Validation** - Zod + class-validator on all endpoints
- **Audit Logging** - Track all authentication events
- **Callback URL Validation** - Prevent open-redirect attacks

### Infrastructure

- **PostgreSQL 16** - Primary database
- **Redis 7** - Session cache + BullMQ job queue
- **Docker Compose** - Full development stack included
- **Prometheus Metrics** - `/metrics` endpoint
- **OpenTelemetry** - Distributed tracing (opt-in)
- **File Storage** - Local, S3, MinIO, or Cloudflare R2

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm
- Docker & Docker Compose

### 1. Clone and Install

```bash
git clone https://github.com/ateeq1999/nest-better-auth.git
cd nest-better-auth
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nest_better_auth
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=your-secret-at-least-32-chars
REDIS_URL=redis://localhost:6379
```

### 3. Start Development Stack

```bash
pnpm dev
```

This single command:

1. Starts Docker services (Postgres, Redis, Mailpit, MinIO)
2. Runs database migrations
3. Seeds development data
4. Starts the NestJS dev server

### 4. Access Services

| Service      | URL                          | Description       |
| ------------ | ---------------------------- | ----------------- |
| API          | http://localhost:3000        | Main API server   |
| Swagger Docs | http://localhost:3000/docs   | API documentation |
| Health Check | http://localhost:3000/health | Server health     |
| Mailpit      | http://localhost:8025        | Email inbox (dev) |
| Adminer      | http://localhost:8080        | Database browser  |

## Authentication Flows

### Email + Password

```bash
# Sign up
curl -X POST http://localhost:3000/v1/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Secure123!","name":"John Doe"}'

# Sign in (web - cookie)
curl -X POST http://localhost:3000/v1/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"admin@example.com","password":"Admin123!"}'

# Sign in (mobile - Bearer token)
curl -X POST "http://localhost:3000/v1/api/auth/sign-in?token=true" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!"}'
```

### OAuth / Social Login

```bash
# Redirect to Google
curl -I http://localhost:3000/api/auth/sign-in/social?provider=google

# OAuth callback is handled automatically by the provider
```

### Bearer Token Usage

```bash
# Get token from sign-in response
TOKEN="bat_abc123..."

# Use in requests
curl http://localhost:3000/v1/api/users/me \
  -H "Authorization: Bearer $TOKEN"
```

## Development

### Project Structure

```
src/
├── auth/               # Authentication controllers & services
│   ├── controllers/     # API endpoint handlers
│   ├── dto/            # Request validation DTOs
│   ├── auth.config.ts  # Better Auth configuration
│   └── ...
├── common/             # Shared utilities
│   ├── guards/         # Auth, Roles, Organization guards
│   ├── decorators/     # @CurrentUser, @Roles, etc.
│   └── interceptors/  # Response envelope, logging
├── config/             # Configuration management
├── db/                 # Drizzle ORM schema & connection
├── email/              # Email templates & sending
├── storage/            # File storage adapters
└── users/              # User management
```

### Available Scripts

```bash
pnpm dev              # Full dev stack (recommended)
pnpm dev:no-seed      # Skip database seeding
pnpm build            # Production build
pnpm start:prod       # Run production build
pnpm test             # Run unit tests
pnpm test:e2e         # Run e2e tests
pnpm lint             # ESLint checks
pnpm format           # Prettier formatting
pnpm db:generate      # Generate migrations
pnpm db:migrate       # Apply migrations
pnpm db:push          # Push schema (dev only)
pnpm bench            # Run benchmarks
```

### Seed Accounts

| Role      | Email                 | Password  |
| --------- | --------------------- | --------- |
| Admin     | admin@example.com     | Admin123! |
| Moderator | moderator@example.com | Mod123!   |
| User      | alice@example.com     | Alice123! |

## Configuration

### Environment Variables

See [Configuration Guide](CONFIGURATION.md) for complete environment variable documentation.

### Feature Flags

All features can be toggled via environment variables:

```env
FEATURE_TWO_FACTOR=false    # Disable 2FA
FEATURE_TRACING=true       # Enable OpenTelemetry
FEATURE_SWAGGER=false      # Disable Swagger docs
```

## Deployment

See [Deployment Guide](DEPLOYMENT.md) for:

- Docker Compose production setup
- Environment configuration
- Reverse proxy setup (Nginx)
- Health checks and monitoring
- Database migrations in production

## Documentation

- [Quick Start Guide](QUICKSTART.md)
- [Architecture Overview](ARCHITECTURE.md)
- [API Reference](API.md)
- [Configuration Guide](CONFIGURATION.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Contributing Guide](CONTRIBUTING.md)

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- [Documentation](https://github.com/yourusername/nest-better-auth/docs)
- [Issue Tracker](https://github.com/yourusername/nest-better-auth/issues)
- [Discussions](https://github.com/yourusername/nest-better-auth/discussions)
