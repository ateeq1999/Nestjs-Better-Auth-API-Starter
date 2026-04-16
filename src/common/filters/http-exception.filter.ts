import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Global exception filter — converts every unhandled exception into the
 * standard API envelope error shape:
 *
 *   {
 *     "success": false,
 *     "error": {
 *       "code": "NOT_FOUND",
 *       "message": "User abc not found",
 *       "details": ["..."]   // present for ValidationPipe 400 errors only
 *     },
 *     "meta": { "timestamp": "...", "requestId": "..." }
 *   }
 *
 * Applied globally in main.ts via app.useGlobalFilters().
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx    = host.switchToHttp();
    const reply  = ctx.getResponse<FastifyReply>();
    const req    = ctx.getRequest<FastifyRequest>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Extract message + optional details (ValidationPipe sends an array)
    let message: string | string[] = 'Internal server error';
    let details: string[] | undefined;

    if (exception instanceof HttpException) {
      const raw = exception.getResponse();
      if (typeof raw === 'string') {
        message = raw;
      } else if (typeof raw === 'object' && raw !== null) {
        const r = raw as Record<string, unknown>;
        const m = r['message'];
        if (Array.isArray(m)) {
          // ValidationPipe — first entry becomes message, all go into details
          details = m as string[];
          message = details[0] ?? exception.message;
        } else {
          message = (m as string) ?? exception.message;
        }
      }
    }

    // Machine-readable code from HTTP status name (e.g. "NOT_FOUND", "FORBIDDEN")
    const code = HttpStatus[status] ?? 'INTERNAL_SERVER_ERROR';

    void reply.status(status).send({
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: String(req.id),
      },
    });
  }
}
