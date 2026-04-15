import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { UserModule } from './users/user.module';
import { AuditModule } from './audit/audit.module';
import { AppConfigModule } from './config/config.module';
import { validateEnv } from './config/env.config';

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
    AppConfigModule,
    AuditModule,
    AuthModule,
    UserModule,
    HealthModule,
  ],
  providers: [
    // Apply ThrottlerGuard globally so every route is rate-limited by default
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
