# API Reference

Complete API documentation for the NestJS Better-Auth API Starter.

## Base URL

```
http://localhost:3000
```

API versioning: Use `/v1/api/` for explicit versioning or `/api/` for the default version.

## Authentication

All endpoints that require authentication use one of:

1. **Cookie-based** - Session cookie set on sign-in
2. **Bearer Token** - `Authorization: Bearer <token>` header

### Signing In

#### Email + Password (Cookie)

```http
POST /v1/api/auth/sign-in
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Secure123!"
}
```

Response:

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  },
  "session": { ... }
}
```

#### Email + Password (Bearer Token)

```http
POST /v1/api/auth/sign-in?token=true
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Secure123!"
}
```

Response:

```json
{
  "token": "bat_abc123...",
  "user": { ... }
}
```

---

## Identity Endpoints

### Sign Up

Create a new user account.

```http
POST /v1/api/auth/sign-up
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Response** (201 Created):

```json
{
  "user": {
    "id": "uuid",
    "email": "newuser@example.com",
    "name": "John Doe",
    "role": "user",
    "emailVerified": false
  },
  "session": null
}
```

> Note: `session` is `null` because email verification is required before sign-in.

### Sign In

```http
POST /v1/api/auth/sign-in
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Secure123!"
}
```

### Sign Out

```http
POST /v1/api/auth/sign-out
```

### Get Session

```http
GET /v1/api/auth/session
```

Response:

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  },
  "session": {
    "id": "session-id",
    "expiresAt": "2024-01-15T00:00:00.000Z"
  }
}
```

---

## Password Endpoints

### Forget Password

Send a password reset email.

```http
POST /v1/api/auth/forget-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### Reset Password

Reset password using the token from email.

```http
POST /v1/api/auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "password": "NewSecurePassword123!"
}
```

### Change Password

Change password while authenticated (requires current password).

```http
POST /v1/api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "CurrentPassword123!",
  "newPassword": "NewSecurePassword123!"
}
```

---

## Verification Endpoints

### Verify Email

Verify email using the token from the verification email.

```http
POST /v1/api/auth/verify-email
Content-Type: application/json

{
  "token": "verification-token-from-email"
}
```

### Send Verification Email

Resend the verification email to the authenticated user.

```http
POST /v1/api/auth/send-verification-email
Authorization: Bearer <token>
```

---

## OAuth Endpoints

### Initiate Social Sign-In

```http
GET /api/auth/sign-in/social?provider=google
```

Query Parameters:

- `provider` (required): `google`, `apple`, or custom provider ID
- `callbackURL` (optional): URL to redirect after successful auth
- `errorCallbackURL` (optional): URL to redirect on failure

### OAuth Callback

```http
GET /api/auth/callback/:provider
```

Handled automatically by the OAuth provider.

---

## Two-Factor Authentication

### Enable 2FA

```http
POST /v1/api/auth/two-factor/enable
Authorization: Bearer <token>
```

Response:

```json
{
  "qrCode": "data:image/png;base64,...",
  "uri": "otpauth://totp/..."
}
```

### Verify 2FA Setup

```http
POST /v1/api/auth/two-factor/verify-totp
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "123456"
}
```

### Disable 2FA

```http
POST /v1/api/auth/two-factor/disable
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "123456"
}
```

### Sign In with 2FA

```http
POST /v1/api/auth/sign-in
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Secure123!",
  "totpCode": "123456"
}
```

---

## Magic Link

### Send Magic Link

```http
POST /v1/api/auth/magic-link/send-magic-link
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### Verify Magic Link

```http
GET /v1/api/auth/magic-link/verify-magic-link?token=<token>&callbackURL=<url>
```

---

## User Endpoints

### Get Current User

```http
GET /v1/api/users/me
Authorization: Bearer <token>
```

Response:

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "user",
  "image": "https://...",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Upload Avatar

```http
POST /v1/api/users/me/avatar
Authorization: Bearer <token>
Content-Type: multipart/form-data

avatar: <file>
```

Max file size: 5 MB

### Register Device Token

For push notifications (FCM/APNs).

```http
POST /v1/api/users/me/device-tokens
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "fcm-token-or-apns-token",
  "platform": "ios" | "android"
}
```

### Remove Device Token

```http
DELETE /v1/api/users/me/device-tokens/:id
Authorization: Bearer <token>
```

---

## Admin Endpoints

Requires `role = admin`.

### Get Users

```http
GET /v1/api/admin/users?limit=20&cursor=<cursor>&search=<query>
Authorization: Bearer <token>
```

Query Parameters:

- `limit` (optional): Number of results (default: 20, max: 100)
- `cursor` (optional): Pagination cursor
- `search` (optional): Search by email or name
- `role` (optional): Filter by role
- `verified` (optional): Filter by email verification status

### Get User Stats

```http
GET /v1/api/admin/users/stats
Authorization: Bearer <token>
```

Response:

```json
{
  "total": 1000,
  "admins": 5,
  "banned": 10,
  "deleted": 50
}
```

### Get User

```http
GET /v1/api/admin/users/:id
Authorization: Bearer <token>
```

### Update User

```http
PATCH /v1/api/admin/users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "moderator",
  "banned": false,
  "emailVerified": true
}
```

### Delete User (Soft Delete)

```http
DELETE /v1/api/admin/users/:id
Authorization: Bearer <token>
```

### Get Audit Logs

```http
GET /v1/api/admin/audit-logs?userId=<userId>&limit=20&cursor=<cursor>
Authorization: Bearer <token>
```

---

## Organization Endpoints

### Create Organization

```http
POST /v1/api/organizations
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Organization"
}
```

### List Organizations

```http
GET /v1/api/organizations
Authorization: Bearer <token>
```

### Get Organization

```http
GET /v1/api/organizations/:id
Authorization: Bearer <token>
X-Organization-Id: <org-id>
```

### Update Organization

```http
PATCH /v1/api/organizations/:id
Authorization: Bearer <token>
X-Organization-Id: <org-id>
Content-Type: application/json

{
  "name": "New Name"
}
```

### Delete Organization

```http
DELETE /v1/api/organizations/:id
Authorization: Bearer <token>
X-Organization-Id: <org-id>
```

### Add Member

```http
POST /v1/api/organizations/:id/members
Authorization: Bearer <token>
X-Organization-Id: <org-id>
Content-Type: application/json

{
  "userId": "user-uuid",
  "role": "member" | "admin" | "owner"
}
```

### List Members

```http
GET /v1/api/organizations/:id/members
Authorization: Bearer <token>
X-Organization-Id: <org-id>
```

### Update Member Role

```http
PATCH /v1/api/organizations/:id/members/:userId
Authorization: Bearer <token>
X-Organization-Id: <org-id>
Content-Type: application/json

{
  "role": "admin"
}
```

### Remove Member

```http
DELETE /v1/api/organizations/:id/members/:userId
Authorization: Bearer <token>
X-Organization-Id: <org-id>
```

### Invite Member

```http
POST /v1/api/organizations/:id/invitations
Authorization: Bearer <token>
X-Organization-Id: <org-id>
Content-Type: application/json

{
  "email": "invitee@example.com",
  "role": "member"
}
```

### Accept Invitation

```http
POST /v1/api/organizations/invitations/accept
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "invitation-token"
}
```

---

## Token Endpoints

### Refresh Token

```http
POST /v1/api/auth/token/refresh
Authorization: Bearer <token>
```

---

## Health & Monitoring

### Health Check

```http
GET /health
```

Response:

```json
{
  "status": "ok",
  "database": "up"
}
```

### Prometheus Metrics

```http
GET /metrics
```

---

## Response Envelope

All API responses (except auth proxy endpoints) follow this envelope format:

### Success

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req-uuid"
  }
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req-uuid",
    "pagination": {
      "limit": 20,
      "hasNextPage": true,
      "nextCursor": "cursor-xyz"
    }
  }
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "User not found",
    "details": []
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req-uuid"
  }
}
```

## Error Codes

| Code                | HTTP Status | Description              |
| ------------------- | ----------- | ------------------------ |
| `VALIDATION_ERROR`  | 400         | Invalid request body     |
| `UNAUTHORIZED`      | 401         | Not authenticated        |
| `FORBIDDEN`         | 403         | Insufficient permissions |
| `NOT_FOUND`         | 404         | Resource not found       |
| `CONFLICT`          | 409         | Resource already exists  |
| `TOO_MANY_REQUESTS` | 429         | Rate limit exceeded      |
| `INTERNAL_ERROR`    | 500         | Internal server error    |

---

## OpenAPI Documentation

Interactive API documentation is available at:

```
http://localhost:3000/docs
```

Swagger UI provides:

- Interactive request builder
- Request/response schemas
- Authentication configuration
- Try-it-out functionality
