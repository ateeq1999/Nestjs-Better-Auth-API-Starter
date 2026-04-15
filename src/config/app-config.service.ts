import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Typed wrapper around ConfigService.
 * Inject this wherever you need env vars so values are type-safe and mockable in tests.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  get port(): number {
    return this.config.get<number>('PORT') ?? 5555;
  }

  get nodeEnv(): string {
    return this.config.get<string>('NODE_ENV') ?? 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get databaseUrl(): string {
    return this.config.getOrThrow<string>('DATABASE_URL');
  }

  get betterAuthUrl(): string {
    return this.config.getOrThrow<string>('BETTER_AUTH_URL');
  }

  get betterAuthSecret(): string {
    return this.config.getOrThrow<string>('BETTER_AUTH_SECRET');
  }

  get cookieSecret(): string | undefined {
    return this.config.get<string>('COOKIE_SECRET');
  }

  get corsOrigins(): string[] {
    return (this.config.get<string>('CORS_ORIGINS') ?? 'http://localhost:5173,http://localhost:3000')
      .split(',')
      .map((o) => o.trim());
  }

  get allowedCallbackSchemes(): string[] {
    return (this.config.get<string>('ALLOWED_CALLBACK_SCHEMES') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  get smtpHost(): string {
    return this.config.get<string>('SMTP_HOST') ?? 'localhost';
  }

  get smtpPort(): number {
    return this.config.get<number>('SMTP_PORT') ?? 1025;
  }

  get smtpFrom(): string {
    return this.config.get<string>('SMTP_FROM') ?? 'noreply@localhost';
  }

  get smtpUser(): string | undefined {
    return this.config.get<string>('SMTP_USER');
  }

  get smtpPass(): string | undefined {
    return this.config.get<string>('SMTP_PASS');
  }
}
