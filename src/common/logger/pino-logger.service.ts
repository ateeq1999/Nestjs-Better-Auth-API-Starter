import { Injectable, LoggerService } from '@nestjs/common';
import type { FastifyBaseLogger } from 'fastify';

/**
 * NestJS LoggerService backed by Fastify's Pino instance.
 *
 * Usage in main.ts:
 *   const app = await NestFactory.create(..., { logger: false });
 *   app.useLogger(app.get(PinoLoggerService));
 *
 * Or pass it directly at bootstrap time (before DI is ready):
 *   new FastifyAdapter({ logger: true }) + PinoLoggerService.fromPinoLogger(fastify.log)
 *
 * This bridges Fastify's request-scoped Pino logger with NestJS's Logger
 * so all application logs share the same structured JSON format and can be
 * correlated with the Fastify access log via the request ID.
 */
@Injectable()
export class PinoLoggerService implements LoggerService {
  constructor(private readonly pino: FastifyBaseLogger) {}

  static fromPinoLogger(logger: FastifyBaseLogger): PinoLoggerService {
    return new PinoLoggerService(logger);
  }

  log(message: string, context?: string): void {
    this.pino.info({ context }, message);
  }

  error(message: string, trace?: string, context?: string): void {
    this.pino.error({ context, trace }, message);
  }

  warn(message: string, context?: string): void {
    this.pino.warn({ context }, message);
  }

  debug(message: string, context?: string): void {
    this.pino.debug({ context }, message);
  }

  verbose(message: string, context?: string): void {
    this.pino.trace({ context }, message);
  }
}
