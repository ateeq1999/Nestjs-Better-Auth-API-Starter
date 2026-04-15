import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { Observable, tap } from 'rxjs';

/**
 * Logs every request in the format:
 *   [HTTP] POST /api/v1/auth/sign-in → 200 in 12ms [req-id: abc123]
 *
 * Applied globally in main.ts via app.useGlobalInterceptors().
 * Only covers routes whose response passes through the NestJS interceptor
 * chain (i.e. routes that return a value, not those that call reply.send()
 * directly via callAuthHandler — those are logged by Fastify's own logger).
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const { method, url, id } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse<{ statusCode: number }>();
          const ms = Date.now() - start;
          this.logger.log(`${method} ${url} → ${res.statusCode} in ${ms}ms [${String(id)}]`);
        },
        error: (err: { status?: number }) => {
          const ms = Date.now() - start;
          const status = err?.status ?? 500;
          this.logger.warn(`${method} ${url} → ${status} in ${ms}ms [${String(id)}]`);
        },
      }),
    );
  }
}
