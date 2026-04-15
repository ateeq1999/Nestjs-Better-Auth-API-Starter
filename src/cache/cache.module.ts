import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createKeyvAdapter } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';

/**
 * Redis-backed cache module.
 *
 * Used primarily by AuthGuard (N12) to cache session lookups so that
 * every request to a protected route does not hit the database.
 *
 * Cache TTL is set to 4 minutes — just under better-auth's cookieCache.maxAge
 * of 5 minutes, so the cached session always reflects the live session state.
 *
 * Falls back gracefully to in-memory caching when REDIS_URL is not set
 * (e.g. local development without Redis).
 */
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (redisUrl) {
          return {
            stores: [createKeyvAdapter(new KeyvRedis(redisUrl))],
            ttl: 4 * 60 * 1000, // 4 minutes in ms
          };
        }
        // No Redis — use default in-memory store
        return { ttl: 4 * 60 * 1000 };
      },
    }),
  ],
  exports: [CacheModule],
})
export class AppCacheModule {}
