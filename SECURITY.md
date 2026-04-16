# Security Policy

This document outlines the security practices and reporting procedures for the NestJS Better-Auth project.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

We recommend always using the latest stable version.

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

### How to Report

1. **Do NOT** create a public GitHub issue for security vulnerabilities
2. Email us directly at: security@example.com (replace with your email)
3. Or use [GitHub's Private vulnerability reporting](https://github.com/yourusername/nest-better-auth/security/advisories/new)

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Assessment**: Within 7 days
- **Fix Development**: Based on severity
- **Disclosure**: Coordinated with reporter

## Security Best Practices

### For Users

#### Use Strong Secrets

```env
# Generate secure secrets
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
COOKIE_SECRET=$(openssl rand -base64 32)
```

#### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong, unique secrets (32+ characters)
- [ ] Configure `CORS_ORIGINS` to specific domains
- [ ] Enable HTTPS/TLS
- [ ] Disable Swagger in production (`FEATURE_SWAGGER=false`)
- [ ] Set up database credentials properly
- [ ] Enable Redis authentication

#### Environment Variables

Never commit `.env` files or secrets to version control.

```bash
# Add to .gitignore
.env
.env.local
.env.*.local
```

### For Developers

#### Input Validation

All user input must be validated using DTOs:

```typescript
// Always validate input
export class SignInDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

#### SQL Injection Prevention

Use Drizzle ORM's parameterized queries:

```typescript
// Good - parameterized query
await db.select().from(user).where(eq(user.id, id));

// Bad - string concatenation (never do this)
// await db.execute(`SELECT * FROM users WHERE id = '${id}'`);
```

#### Authentication

- Never store plain-text passwords
- Use bcrypt with sufficient rounds (12+)
- Implement account lockout for brute-force protection
- Require email verification for new accounts

#### Session Security

- Use HTTP-only cookies for web clients
- Implement Bearer tokens for API clients
- Set appropriate session expiration
- Rotate secrets periodically

#### Rate Limiting

Protect against abuse:

```typescript
@Throttle({ default: { ttl: 60000, limit: 100 } })
@Controller()
export class MyController {}
```

#### Output Encoding

Use `class-transformer` and `class-validator` for safe serialization:

```typescript
@Exclude()
export class UserResponse {
  @Expose()
  id: string;

  @Expose()
  email: string;
}
```

## Known Considerations

### OAuth Provider Security

When using OAuth providers:

1. Validate redirect URIs strictly
2. Use PKCE for public clients
3. Verify state parameter to prevent CSRF
4. Store tokens securely (encrypt at rest)

### Password Requirements

Users should be encouraged to use strong passwords. Our requirements:

- Minimum 8 characters
- Consider adding custom rules for your use case

### Email Security

- Verify email addresses before allowing sign-in
- Use time-limited verification tokens
- Implement rate limiting on email sending

### API Security

- Implement CORS properly
- Use Content Security Policy headers
- Protect against XSS and injection attacks
- Validate all request headers

## Dependency Security

### Keep Dependencies Updated

```bash
# Check for outdated dependencies
pnpm outdated

# Update safely
pnpm update
```

### Security Audits

```bash
# Run npm audit
pnpm audit

# Fix vulnerabilities
pnpm audit fix
```

### SBOM (Software Bill of Materials)

Generate and track dependencies:

```bash
# Generate SBOM
pnpm sbom

# Check for vulnerabilities
pnpm audit
```

## Security Headers

The application includes security headers via `@fastify/helmet`:

- Content-Security-Policy
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Strict-Transport-Security

## Logging and Monitoring

### Audit Logging

Auth events are logged to the `audit_logs` table:

- Sign-in attempts (success/failure)
- Sign-up events
- Password changes
- Account lockouts
- OAuth connections

### Monitoring

Set up alerts for:

- High error rates
- Unusual traffic patterns
- Failed authentication spikes
- Database connection failures

## Incident Response

If a security incident occurs:

1. **Contain** - Isolate affected systems
2. **Assess** - Determine scope and impact
3. **Remediate** - Fix the vulnerability
4. **Notify** - Inform affected users
5. **Review** - Post-mortem and improve

## Security Updates

Security updates will be released as patch versions and announced via:

- GitHub Security Advisories
- Release notes
- Project documentation

## Contact

For security-related questions or concerns:

- Email: security@example.com
- GitHub: [Security Advisories](https://github.com/yourusername/nest-better-auth/security/advisories)

## Acknowledgments

We appreciate the security research community for helping keep this project secure. Contributors will be acknowledged (with permission) in security advisories.
