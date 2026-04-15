import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
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
    AuthModule,
  ],
})
export class AppModule {}
