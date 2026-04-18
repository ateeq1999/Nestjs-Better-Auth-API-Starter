# Quick Start Guide

Get up and running with NestJS Better-Auth in minutes.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20 or higher
- **pnpm** 8 or higher
- **Docker** and **Docker Compose**

Verify your versions:

```bash
node --version   # Should be >= 20.0.0
pnpm --version   # Should be >= 8.0.0
docker --version  # Should be >= 24.0.0
docker compose version  # Should be >= 2.0.0
```

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/nest-better-auth.git
cd nest-better-auth
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Required
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nest_better_auth
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=your-random-secret-at-least-32-characters

# Redis (optional but recommended)
REDIS_URL=redis://localhost:6379
```

Generate a secure secret:

```bash
openssl rand -base64 32
```

## Starting Development

### Option 1: Full Stack (Recommended)

Start everything with one command:

```bash
pnpm dev
```

This will:

1. Start Docker services (Postgres, Redis, Mailpit, MinIO)
2. Wait for database to be ready
3. Run database migrations
4. Seed development data
5. Start NestJS in watch mode

### Option 2: Manual Start

If you prefer to control each component:

```bash
# Start infrastructure
pnpm infra:up

# Run migrations
pnpm db:migrate

# Seed data
pnpm db:seed

# Start server
pnpm start:dev
```

## Verify Installation

### Check Health

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "ok",
  "database": "up"
}
```

### Access Swagger Docs

Open your browser:

```
http://localhost:3000/docs
```

### Check Email (Development)

All emails are trapped by Mailpit:

```
http://localhost:8025
```

## Your First API Call

### Sign Up a User

```bash
curl -X POST http://localhost:3000/v1/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "name": "Test User"
  }'
```

### Verify Email

1. Open http://localhost:8025
2. Find the verification email
3. Click the verification link

### Sign In

```bash
# Cookie-based (web)
curl -X POST http://localhost:3000/v1/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email": "test@example.com", "password": "TestPassword123!"}'

# Bearer token (mobile/API)
curl -X POST "http://localhost:3000/v1/api/auth/sign-in?token=true" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "TestPassword123!"}'
```

### Get User Profile

```bash
# With cookie
curl http://localhost:3000/v1/api/users/me -b cookies.txt

# With token
curl http://localhost:3000/v1/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Using Pre-seeded Accounts

The development seed includes test accounts:

| Role      | Email                 | Password    |
| --------- | --------------------- | ----------- |
| Admin     | admin@example.com     | Admin123!   |
| Moderator | moderator@example.com | Mod123!     |
| User      | alice@example.com     | Alice123!   |
| User      | bob@example.com       | Bob123!     |
| User      | charlie@example.com   | Charlie123! |

These accounts are already email-verified for convenience.

## Next Steps

### Explore Features

1. **Try OAuth** - Sign in with Google or Apple
2. **Enable 2FA** - Set up two-factor authentication
3. **Test Magic Link** - Passwordless sign-in
4. **Create Organization** - Multi-tenant workspace

### Read the Documentation

- [Architecture Overview](ARCHITECTURE.md)
- [API Reference](API.md)
- [Configuration Guide](CONFIGURATION.md)
- [Deployment Guide](DEPLOYMENT.md)

### Build Your Feature

Add your business logic following the patterns in [Adding Business Features](../README.md#adding-business-features).

## Common Development Tasks

### Database Operations

```bash
pnpm db:generate   # Generate migrations from schema changes
pnpm db:migrate    # Apply pending migrations
pnpm db:push       # Push schema directly (dev only)
pnpm db:seed       # Re-seed development data
pnpm db:studio     # Open Drizzle Studio
pnpm db:check      # Check for schema drift
```

### Running Tests

```bash
pnpm test              # Run all unit tests
pnpm test:watch        # Watch mode for tests
pnpm test:cov          # Coverage report
pnpm test:e2e          # End-to-end tests
```

### Code Quality

```bash
pnpm lint    # ESLint checks
pnpm format  # Prettier formatting
pnpm build   # Production build
```

### Benchmarks

```bash
pnpm bench         # Run all benchmark scenarios
pnpm bench:health  # Quick health check benchmark
```

## Troubleshooting

### Port Already in Use

If port 3000 is in use:

```bash
PORT=3000 pnpm dev
```

### Database Connection Issues

1. Ensure Docker is running
2. Check database is healthy:
   ```bash
   docker compose ps
   ```
3. Verify DATABASE_URL in `.env`

### Redis Connection Issues

1. Check Redis is running:
   ```bash
   docker compose logs redis
   ```
2. Verify REDIS_URL in `.env`

### Clean Reset

To reset everything:

```bash
# Stop everything
pnpm infra:down

# Remove volumes (deletes data)
pnpm infra:reset

# Start fresh
pnpm dev
```

## Getting Help

- [GitHub Issues](https://github.com/yourusername/nest-better-auth/issues)
- [Discussions](https://github.com/yourusername/nest-better-auth/discussions)
- Check the [documentation](../docs/)

## Next: Deployment

Ready to deploy? See the [Deployment Guide](DEPLOYMENT.md).
