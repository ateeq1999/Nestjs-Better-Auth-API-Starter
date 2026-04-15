import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import KeyvRedis from '@keyv/redis';
import Keyv from 'keyv';

/**
 * Redis-backed session cache (N12).
 *
 * When REDIS_URL is set, sessions validated by AuthGuard are cached for 4 minutes,
 * avoiding a database hit on every authenticated request.
 *
 * When REDIS_URL is not set (e.g. local dev without Docker), the module falls back
 * to the default in-memory store — no code changes required.
 *
 * Add to .env:
 *   REDIS_URL=redis://localhost:6379
 */
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        const stores = redisUrl
          ? [new Keyv({ store: new KeyvRedis(redisUrl) })]
          : [new Keyv()];
        return { stores, ttl: 4 * 60 * 1000 };
      },
    }),
  ],
  exports: [CacheModule],
})
export class AppCacheModule {}
