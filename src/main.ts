import './tracing'; // OTel — must be first (OB3)
import 'dotenv/config';
import { NestFactory, Reflector } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ClassSerializerInterceptor, ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyMultipart from '@fastify/multipart';
import { createBullBoard } from '@bull-board/api';
import { FastifyAdapter as BullBoardFastifyAdapter } from '@bull-board/fastify';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { PinoLoggerService } from './common/logger/pino-logger.service';

async function bootstrap() {
  const cookieSecret = process.env.COOKIE_SECRET;
  if (!cookieSecret && process.env.NODE_ENV === 'production') {
    throw new Error('COOKIE_SECRET env var must be set in production');
  }

  // Pino-Loki transport — ships structured logs to Loki when LOKI_URL is set (OB4)
  const lokiUrl = process.env.LOKI_URL;
  const pinoOptions = lokiUrl
    ? {
        transport: {
          targets: [
            { target: 'pino/file', options: { destination: 1 }, level: 'info' }, // stdout
            {
              target: 'pino-loki',
              options: {
                host: lokiUrl,
                labels: { app: 'nest-better-auth', env: process.env.NODE_ENV ?? 'development' },
                batching: true,
                interval: 5,
              },
              level: 'info',
            },
          ],
        },
      }
    : {};

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ genReqId: () => crypto.randomUUID(), ...pinoOptions }),
    { bodyParser: false },
  );

  // Graceful shutdown — drain in-flight requests on SIGTERM / SIGINT
  app.enableShutdownHooks();

  /**
   * Use the raw Fastify instance for plugin registration to avoid the
   * RawServerBase vs RawServerDefault type mismatch in @fastify/* plugins.
   * These plugins are typed only for HTTP/1.1 (RawServerDefault) while
   * FastifyAdapter's type is the broader RawServerBase (HTTP + HTTP2).
   */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const fastify = app.getHttpAdapter().getInstance();

  // Wire Fastify's Pino instance into NestJS Logger so all app logs share
  // the same structured JSON format and request-ID correlation (N1)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  app.useLogger(PinoLoggerService.fromPinoLogger(fastify.log));

  // Security headers — helmet sets CSP, HSTS, X-Frame-Options, etc.
  await fastify.register(fastifyHelmet, {
    // Relax CSP for Swagger UI (inline scripts + styles are required)
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
  });

  await fastify.register(fastifyCookie, {
    secret: cookieSecret || 'dev-cookie-secret-change-in-production',
  });

  // CORS — allowed origins from CORS_ORIGINS env var
  const rawOrigins = process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:3000';
  const allowedOrigins = rawOrigins.split(',').map((o) => o.trim());
  await fastify.register(fastifyCors, {
    origin: allowedOrigins,
    credentials: true,
  });

  // Forward the Fastify request ID as a response header for client-side tracing
  fastify.addHook('onSend', (_req, reply, _payload, done) => {
    void reply.header('X-Request-Id', _req.id as string);
    done();
  });

  // Multipart file upload — required for avatar upload endpoint (F5)
  await fastify.register(fastifyMultipart, {
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB global limit
  });

  // Raw JSON body parser — required when bodyParser:false with better-auth
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (_req, body, done) => {
      try {
        done(null, JSON.parse(body as string));
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  // ClassSerializerInterceptor — honours @Exclude() / @Expose() on response DTOs
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
    new LoggingInterceptor(),
  );

  // Global validation — strips unknown fields, throws on invalid input
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // URI versioning — /v1/api/... routes; defaultVersion makes /api/... backward-compatible.
  // Unversioned routes (health, OAuth callbacks) use VERSION_NEUTRAL.
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Swagger / OpenAPI — available at /docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('NestJS Better-Auth API')
    .setDescription(
      'Full-auth API starter — sign-up, sign-in, email verification, password reset, Google OAuth, Bearer token (mobile)',
    )
    .setVersion('1.0')
    .addCookieAuth('better-auth.session_token')
    .addBearerAuth({ type: 'http', scheme: 'bearer' }, 'bearer-token')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  // Bull Board UI — /admin/queues (only mounted when REDIS_URL is set)
  // Shows all BullMQ queues registered in EmailModule
  if (process.env.REDIS_URL) {
    const serverAdapter = new BullBoardFastifyAdapter();
    serverAdapter.setBasePath('/admin/queues');
    createBullBoard({ queues: [], serverAdapter });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await (fastify as any).register(serverAdapter.registerPlugin(), { prefix: '/admin/queues' });
  }

  const port = process.env.PORT ?? 5555;
  await app.listen(port, '0.0.0.0');
  console.log(`Server      → http://localhost:${port}`);
  console.log(`Swagger UI  → http://localhost:${port}/docs`);
  console.log(`Mailpit UI  → http://localhost:8025`);
  if (process.env.REDIS_URL) {
    console.log(`Bull Board  → http://localhost:${port}/admin/queues`);
  }
}

void bootstrap();