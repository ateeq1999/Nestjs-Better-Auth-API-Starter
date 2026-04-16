import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { Observable, map } from 'rxjs';
import { SKIP_ENVELOPE_KEY } from '../decorators/skip-envelope.decorator';
import type { CursorPage } from '../dto/pagination.dto';
import type { ResponseMeta } from '../dto/api-response.dto';

/**
 * Wraps every NestJS handler response in the standard API envelope:
 *
 *   { success: true, data: T, meta: { timestamp, requestId } }
 *
 * Pagination flattening:
 *   When the handler returns a CursorPage<T> the interceptor detects it and
 *   hoists the pagination info into meta to avoid awkward double-nesting:
 *   { success: true, data: T[], meta: { ..., pagination: { limit, hasNextPage, nextCursor } } }
 *
 * Opt-out:
 *   Decorate the controller or handler with @SkipEnvelope() to bypass.
 *   All better-auth proxy controllers use this because their response shapes
 *   are consumed by better-auth SDKs that expect raw field names.
 *
 * Order in main.ts:
 *   Register AFTER ClassSerializerInterceptor so @Exclude() fields are already
 *   stripped before the envelope wraps the result.
 */
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_ENVELOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skip) return next.handle();

    const req = context.switchToHttp().getRequest<FastifyRequest>();

    return next.handle().pipe(
      map((result: unknown) => {
        const meta = this.buildMeta(req);

        // CursorPage<T> — flatten pagination into meta
        if (isCursorPage(result)) {
          return {
            success: true,
            data: result.data,
            meta: {
              ...meta,
              pagination: {
                limit: result.meta.limit,
                hasNextPage: result.meta.hasNextPage,
                nextCursor: result.meta.nextCursor,
              },
            },
          };
        }

        return { success: true, data: result, meta };
      }),
    );
  }

  private buildMeta(req: FastifyRequest): ResponseMeta {
    return {
      timestamp: new Date().toISOString(),
      requestId: String(req.id),
    };
  }
}

/** Type guard — checks for the CursorPage<T> shape returned by buildCursorPage() */
function isCursorPage(value: unknown): value is CursorPage<unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    'data' in value &&
    Array.isArray((value as CursorPage<unknown>).data) &&
    'meta' in value &&
    typeof (value as CursorPage<unknown>).meta === 'object' &&
    'hasNextPage' in (value as CursorPage<unknown>).meta
  );
}
