import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { features } from './config/features';
import { validateEnv } from './config/env.config';
import { DrizzleModule } from './db/drizzle.module';
import { AppConfigModule } from './config/config.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { UserModule } from './users/user.module';
import { EmailPreviewController } from './email/email-preview.controller';

// ── Conditional imports (resolved at startup from feature flags) ──────────────
const AuditModuleImport  = features.auditLog  ? [require('./audit/audit.module').AuditModule]   : [];
const CacheModuleImport  = features.redis      ? [require('./cache/cache.module').AppCacheModule] : [];
const JobsModuleImport   = features.scheduler  ? [require('./jobs/jobs.module').JobsModule]      : [];
const MetricsModuleImport = features.metrics   ? [require('./metrics/metrics.module').MetricsModule] : [];

@Module({
  imports: [
    // Core — always on
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    DrizzleModule,     // @Global — provides DrizzleService to all modules
    AppConfigModule,   // typed ConfigService wrapper (N8)
    HealthModule,

    // Rate limiting — controlled by features.rateLimiting
    ...(features.rateLimiting
      ? [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])]
      : []),

    // Feature-gated modules
    ...CacheModuleImport,   // Redis session cache (N12)
    ...AuditModuleImport,   // Auth event audit log (S8)
    AuthModule,             // All auth controllers + LockoutService
    UserModule,             // UserService + DeviceTokenController + UploadController + AdminController
    ...JobsModuleImport,    // Scheduled cleanup jobs (P18)
    ...MetricsModuleImport, // Prometheus metrics (OB1-OB2)
  ],
  // Dev-only email preview route — gated by feature flag AND NODE_ENV
  controllers:
    features.emailPreview && process.env.NODE_ENV !== 'production'
      ? [EmailPreviewController]
      : [],
  providers: [
    // ThrottlerGuard only wired when rate limiting is on
    ...(features.rateLimiting
      ? [{ provide: APP_GUARD, useClass: ThrottlerGuard }]
      : []),
  ],
})
export class AppModule {}
