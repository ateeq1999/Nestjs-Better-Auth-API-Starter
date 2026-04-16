# Architecture Overview

This document provides an in-depth look at the architecture of the NestJS Better-Auth API Starter.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  (Web Browser, Mobile App, API Consumer)                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Swagger   │  │  Rate Limit │  │   Security Headers      │ │
│  │    Docs     │  │   (Throttler)│  │   (@fastify/helmet)     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       NestJS Application                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Controller Layer                          ││
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌─────────────┐ ││
│  │  │ Identity  │ │   User    │ │  Admin    │ │ Organization│ ││
│  │  │Controller │ │Controller │ │Controller │ │ Controller  │ ││
│  │  └───────────┘ └───────────┘ └───────────┘ └─────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                     Guard Layer                              ││
│  │  ┌─────────┐ ┌──────────┐ ┌────────────┐ ┌───────────────┐ ││
│  │  │ Auth    │ │  Roles    │ │Organization │ │ Org Roles    │ ││
│  │  │ Guard   │ │  Guard    │ │  Guard     │ │   Guard      │ ││
│  │  └─────────┘ └──────────┘ └────────────┘ └───────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   Service Layer                             ││
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌─────────────┐ ││
│  │  │   User    │ │   Auth    │ │   Audit   │ │  Lockout    │ ││
│  │  │ Service   │ │  Service  │ │  Service   │ │  Service    │ ││
│  │  └───────────┘ └───────────┘ └───────────┘ └─────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
┌─────────────────────────┐    ┌─────────────────────────┐
│    Better Auth Library   │    │     Drizzle ORM        │
│  ┌─────────────────────┐ │    │  ┌───────────────────┐  │
│  │  Session Management │ │    │  │  Query Builder   │  │
│  │  OAuth Flow Handler  │ │    │  │  Type Safety     │  │
│  │  Password Hashing     │ │    │  │  Migrations      │  │
│  │  2FA / TOTP          │ │    │  └───────────────────┘  │
│  │  Magic Link          │ │    └─────────────────────────┘
│  └─────────────────────┘ │
└─────────────────────────┘
                    │                       │
                    ▼                       ▼
┌─────────────────────────┐    ┌─────────────────────────┐
│      Redis Cache        │    │      PostgreSQL         │
│  - Session Cache        │    │  - Users Table          │
│  - Rate Limit Counters  │    │  - Sessions Table       │
│  - BullMQ Queues        │    │  - Audit Logs Table     │
└─────────────────────────┘    │  - Organizations Table    │
                               └─────────────────────────┘
```

## Directory Structure

```
src/
├── auth/                           # Authentication module
│   ├── controllers/
│   │   ├── identity.controller.ts   # Sign-up, sign-in, sign-out
│   │   ├── password.controller.ts  # Password reset/change
│   │   ├── verification.controller.ts # Email verification
│   │   ├── oauth.controller.ts     # OAuth/social login
│   │   ├── magic-link.controller.ts # Magic link auth
│   │   └── user.controller.ts      # User profile
│   ├── dto/                        # Request DTOs
│   ├── responses/                  # Response types
│   ├── utils/
│   │   └── auth-handler.util.ts    # Better Auth integration
│   ├── auth.config.ts              # Better Auth configuration
│   ├── auth.module.ts
│   ├── email.service.ts            # Email sending
│   ├── lockout.service.ts          # Account lockout logic
│   └── password.service.ts         # Password utilities
│
├── common/                         # Shared utilities
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   ├── current-organization.decorator.ts
│   │   ├── roles.decorator.ts
│   │   ├── org-roles.decorator.ts
│   │   └── skip-envelope.decorator.ts
│   ├── dto/
│   │   ├── pagination.dto.ts
│   │   └── api-response.dto.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── guards/
│   │   ├── auth.guard.ts
│   │   ├── roles.guard.ts
│   │   ├── organization.guard.ts
│   │   └── org-roles.guard.ts
│   ├── interceptors/
│   │   ├── logging.interceptor.ts
│   │   └── response-envelope.interceptor.ts
│   └── utils/
│       └── callback-url.util.ts
│
├── config/                         # Configuration
│   ├── app-config.service.ts       # Typed config service
│   ├── config.module.ts
│   ├── env.config.ts              # Environment validation
│   ├── features.config.ts         # Feature flags
│   └── features.ts
│
├── db/                            # Database layer
│   ├── connection.ts             # Raw Drizzle connection
│   ├── drizzle.service.ts         # Injectable Drizzle service
│   ├── drizzle.module.ts         # Drizzle module
│   ├── schema.ts                 # Table definitions
│   ├── zod-schemas.ts            # Zod schemas
│   └── index.ts
│
├── email/                         # Email module
│   ├── templates/                 # Handlebars templates
│   ├── email-preview.controller.ts
│   ├── email-queue.service.ts
│   ├── email.processor.ts
│   ├── email.module.ts
│   └── template.service.ts
│
├── health/                        # Health checks
├── jobs/                          # Scheduled tasks
├── metrics/                       # Prometheus metrics
├── storage/                       # File storage
│   ├── adapters/
│   │   ├── fs.adapter.ts
│   │   ├── minio.adapter.ts
│   │   └── s3.adapter.ts
│   ├── storage.interface.ts
│   └── storage.module.ts
│
├── users/                         # User management
│   ├── admin.controller.ts
│   ├── device-token.controller.ts
│   ├── upload.controller.ts
│   ├── user.module.ts
│   └── user.service.ts
│
├── app.module.ts                  # Root module
├── main.ts                        # Application bootstrap
└── tracing.ts                     # OpenTelemetry setup
```

## Data Flow

### Authentication Flow

```
┌──────────┐      ┌──────────────┐      ┌─────────────────┐      ┌──────────────┐
│  Client  │─────▶│   Controller │─────▶│  Auth Guard      │─────▶│    Service   │
└──────────┘      └──────────────┘      └─────────────────┘      └──────────────┘
                                                                        │
                                                                        ▼
                                           ┌─────────────────┐      ┌──────────────┐
                                           │  Better Auth    │◀─────│    Drizzle   │
                                           │  Handler        │      │    ORM       │
                                           └─────────────────┘      └──────────────┘
                                                  │
                                     ┌─────────────┼─────────────┐
                                     ▼             ▼             ▼
                              ┌──────────┐  ┌──────────┐  ┌──────────┐
                              │ PostgreSQL│  │  Redis   │  │  Email   │
                              │  (Data)   │  │ (Cache)  │  │ (Queue)  │
                              └──────────┘  └──────────┘  └──────────┘
```

### Request Lifecycle

1. **Request Received** - Fastify handles incoming HTTP request
2. **Security Middleware** - Helmet headers, CORS, rate limiting
3. **Validation** - ValidationPipe validates request DTOs
4. **Guards** - AuthGuard validates session/token, RolesGuard checks permissions
5. **Interceptor (Pre-handler)** - Logging interceptor records request start
6. **Controller** - Handles request, calls service methods
7. **Service** - Business logic, database operations
8. **Interceptor (Post-handler)** - Response envelope wrapper, logging
9. **Exception Filter** - Handles errors, returns consistent error format
10. **Response** - Serialized JSON response with cookies

## Database Schema

### Core Tables

```sql
-- Users table
users (
  id            UUID PRIMARY KEY
  email         TEXT UNIQUE NOT NULL
  emailVerified BOOLEAN DEFAULT FALSE
  name          TEXT
  image         TEXT
  role          TEXT DEFAULT 'user'  -- user, moderator, admin
  createdAt     TIMESTAMP
  updatedAt     TIMESTAMP
  deletedAt     TIMESTAMP
)

-- Sessions table
sessions (
  id           TEXT PRIMARY KEY
  userId       UUID REFERENCES users(id)
  expiresAt    TIMESTAMP
  token        TEXT UNIQUE
  ipAddress    TEXT
  userAgent    TEXT
  createdAt    TIMESTAMP
)

-- Accounts table (OAuth providers)
accounts (
  id           TEXT PRIMARY KEY
  userId       UUID REFERENCES users(id)
  accountId    TEXT NOT NULL
  providerId   TEXT NOT NULL
  accessToken  TEXT
  refreshToken TEXT
  expiresAt    TIMESTAMP
  createdAt    TIMESTAMP
)

-- Verification tokens
verifications (
  id         TEXT PRIMARY KEY
  identifier TEXT NOT NULL
  value      TEXT NOT NULL
  expiresAt  TIMESTAMP
  createdAt  TIMESTAMP
)
```

## Security Architecture

### Layered Security

```
┌─────────────────────────────────────────────────────────────┐
│                    1. Network Layer                         │
│  - CORS configuration                                       │
│  - Reverse proxy (Nginx) TLS termination                    │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    2. Application Layer                     │
│  - Rate limiting (100 req/min global, tighter per-route)  │
│  - Request ID / correlation ID tracking                     │
│  - Proxy header stripping                                   │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    3. Authentication Layer                  │
│  - Session validation (cookie or Bearer token)             │
│  - Redis session cache (skip DB per-request)              │
│  - Account lockout after failed attempts                   │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    4. Authorization Layer                   │
│  - Role-based access control (RBAC)                        │
│  - Organization membership verification                    │
│  - Resource ownership checks                               │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    5. Data Layer                           │
│  - Parameterized queries (no SQL injection)               │
│  - Input validation via DTOs + class-validator             │
│  - Output serialization via class-transformer               │
└─────────────────────────────────────────────────────────────┘
```

### Session Caching Strategy

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Request │───▶│  Auth Guard  │───▶│  Redis Cache │───▶│  PostgreSQL  │
└──────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                │              │              │
                                ▼              ▼              ▼
                          Check cache    Hit → return    Miss → query
                          exists?        session        DB → cache → return
```

## Configuration Management

### Environment Configuration

```
.env.example
    │
    ▼
src/config/env.config.ts (validates required vars)
    │
    ├──▶ AppConfigService (typed getters)
    │
    └──▶ features.ts (resolves FEATURE_* overrides)
            │
            ▼
        Feature Flags
        (runtime toggles)
```

### Feature Flags System

Features can be toggled at two levels:

1. **Build-time defaults** - Set in `src/config/features.config.ts`
2. **Runtime override** - Set via `FEATURE_<NAME>` environment variables

This allows shipping a single Docker image with environment-specific feature toggles.

## Performance Considerations

### Session Caching

- Sessions cached in Redis to avoid per-request database hit
- Cache TTL: 5 minutes
- Cache invalidated on sign-out

### Database Connection Pooling

- Pool size configurable via `DB_POOL_MAX`
- Default: 10 connections
- Connection draining on graceful shutdown

### Rate Limiting

- Global: 100 requests per minute
- Auth endpoints: 5 requests per 15 minutes (brute-force protection)
- Custom limits per endpoint via `@Throttle()` decorator

## Observability

### Logging

- Pino logger integrated with Fastify
- Correlation ID (`X-Request-Id`) in every log line
- Structured JSON logs in production
- Pretty printing in development

### Metrics

Prometheus metrics at `/metrics`:

- `http_requests_total` - Request counter by method, path, status
- `http_request_duration_seconds` - Request duration histogram
- `auth_events_total` - Auth events by type (sign-in, sign-up, etc.)
- `active_sessions_total` - Current active sessions

### Tracing

OpenTelemetry integration (opt-in):

- Distributed trace context propagation
- Span creation for database queries
- HTTP request tracing
- OTLP export to Tempo

## Extension Points

### Adding Custom Features

1. **New Module**

   ```
   src/features/
   ├── dto/
   ├── responses/
   ├── my-feature.controller.ts
   ├── my-feature.service.ts
   └── my-feature.module.ts
   ```

2. **Database Changes**
   - Add tables to `src/db/schema.ts`
   - Run `pnpm db:generate` + `pnpm db:migrate`

3. **Register Module**
   - Import in `src/app.module.ts`

### Custom Storage Adapter

Implement `StorageService` interface:

```typescript
export interface StorageService {
  upload(file: Buffer, key: string): Promise<string>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
}
```

## Related Documentation

- [API Reference](API.md)
- [Configuration Guide](CONFIGURATION.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Better Auth Documentation](https://better-auth.com/docs)
