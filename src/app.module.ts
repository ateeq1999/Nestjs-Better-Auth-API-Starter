import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { UserModule } from './users/user.module';
import { AuditModule } from './audit/audit.module';
import { AppConfigModule } from './config/config.module';
import { AppCacheModule } from './cache/cache.module';
import { validateEnv } from './config/env.config';
import { JobsModule } from './jobs/jobs.module';
import { MetricsModule } from './metrics/metrics.module';

/**
 * Root application module.
 *
 * EmailModule (BullMQ) is intentionally commented out here.
 * Uncomment it once Redis is available and REDIS_URL is set in .env.
 * Until then, better-auth calls sendEmail() directly (synchronous SMTP).
 *
 * To enable:
 *   1. Start Redis: docker compose up -d redis
 *   2. Set REDIS_URL=redis://localhost:6379 in .env
 *   3. Uncomment the EmailModule import below
 */
// import { EmailModule } from './email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        // 100 requests per minute globally; tighten per-route where needed
        ttl: 60_000,
        limit: 100,
      },
    ]),
    AppCacheModule,   // Redis-backed session cache (N12); falls back to in-memory
    AppConfigModule,  // Typed ConfigService wrapper (N8)
    AuditModule,      // Auth event audit log (S8)
    AuthModule,       // All auth controllers + LockoutService
    UserModule,       // UserService + DeviceTokenController + UploadController + AdminController
    HealthModule,
    JobsModule,       // Scheduled cleanup jobs (P18)
    MetricsModule,    // Prometheus metrics at /metrics (P14 OB1-OB2)
    // EmailModule,   // BullMQ email queue (N13) — requires REDIS_URL
  ],
  providers: [
    // Apply ThrottlerGuard globally so every route is rate-limited by default
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
