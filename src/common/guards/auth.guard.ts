import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import type { FastifyRequest } from 'fastify';
import { auth } from '../../auth/auth.config';

/**
 * Route guard that validates the current session.
 *
 * Accepts two auth mechanisms:
 *   1. Cookie   — `better-auth.session_token` (web clients)
 *   2. Bearer   — `Authorization: Bearer <token>` (mobile clients, F1/F3)
 *
 * Session lookup is cached in Redis (N12) to avoid hitting the database on
 * every request. Cache TTL is 4 minutes — just under better-auth's
 * cookieCache.maxAge of 5 minutes.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly SESSION_TTL_MS = 4 * 60 * 1000; // 4 minutes

  constructor(
    @Optional() @Inject(CACHE_MANAGER) private readonly cache?: Cache,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<
      FastifyRequest & { user?: unknown; session?: unknown }
    >();

    const headers = this.buildHeaders(req);
    const cacheKey = this.buildCacheKey(req);

    // Check cache first to avoid per-request DB hit (N12)
    if (cacheKey && this.cache) {
      const cached = await this.cache.get<{ user: unknown; session: unknown }>(cacheKey);
      if (cached) {
        req.user = cached.user;
        req.session = cached.session;
        return true;
      }
    }

    const sessionData = await auth.api.getSession({ headers });

    if (!sessionData) {
      throw new UnauthorizedException('No active session');
    }

    req.user = sessionData.user;
    req.session = sessionData.session;

    // Cache the result to skip the next DB lookup
    if (cacheKey && this.cache) {
      await this.cache.set(
        cacheKey,
        { user: sessionData.user, session: sessionData.session },
        this.SESSION_TTL_MS,
      );
    }

    return true;
  }

  /**
   * Build headers forwarded to better-auth's getSession.
   * Supports both cookie-based (web) and Bearer token (mobile) flows.
   */
  private buildHeaders(req: FastifyRequest): Headers {
    const headers = new Headers();

    // Cookie flow (web)
    if (req.headers.cookie) {
      headers.set('cookie', req.headers.cookie);
    }

    // Bearer token flow (mobile — F1/F3)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      headers.set('authorization', authHeader);
    }

    return headers;
  }

  /**
   * Derive a stable cache key from whichever credential is present.
   * Returns null when there is no credential at all (cache miss is fine).
   */
  private buildCacheKey(req: FastifyRequest): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      // Key on the token itself (first 32 chars to keep key small)
      return `session:bearer:${authHeader.slice(7, 39)}`;
    }
    if (req.headers.cookie) {
      // Key on the session cookie value if present
      const match = /better-auth\.session_token=([^;]+)/.exec(req.headers.cookie);
      if (match?.[1]) return `session:cookie:${match[1].slice(0, 32)}`;
    }
    return null;
  }
}
