import './tracing'; // OTel — must be first (OB3)
import 'dotenv/config';
import { NestFactory, Reflector } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ClassSerializerInterceptor, ValidationPipe, VersioningType } from '@nestjs/common';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyMultipart from '@fastify/multipart';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { PinoLoggerService } from './common/logger/pino-logger.service';
import { features, logFeatures } from './config/features';

async function bootstrap() {
  const cookieSecret = process.env.COOKIE_SECRET;
  if (!cookieSecret && process.env.NODE_ENV === 'production') {
    throw new Error('COOKIE_SECRET env var must be set in production');
  }

  // ── Pino-Loki transport (OB4) — only when logShipping feature + LOKI_URL ──
  const lokiUrl = features.logShipping ? process.env.LOKI_URL : undefined;
  const pinoOptions = lokiUrl
    ? {
        transport: {
          targets: [
            { target: 'pino/file', options: { destination: 1 }, level: 'info' },
            {
              target: 'pino-loki',
              options: {
                host: lokiUrl,
                labels: { app: process.env.OTEL_SERVICE_NAME ?? 'nest-better-auth', env: process.env.NODE_ENV ?? 'development' },
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

  app.enableShutdownHooks();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const fastify = app.getHttpAdapter().getInstance();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  app.useLogger(PinoLoggerService.fromPinoLogger(fastify.log));

  await fastify.register(fastifyHelmet, {
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
  });

  await fastify.register(fastifyCookie, {
    secret: cookieSecret || 'dev-cookie-secret-change-in-production',
  });

  const rawOrigins = process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:3000';
  const allowedOrigins = rawOrigins.split(',').map((o) => o.trim());
  await fastify.register(fastifyCors, { origin: allowedOrigins, credentials: true });

  fastify.addHook('onSend', (_req, reply, _payload, done) => {
    void reply.header('X-Request-Id', _req.id as string);
    done();
  });

  await fastify.register(fastifyMultipart, {
    limits: { fileSize: 5 * 1024 * 1024 },
  });

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
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
    new LoggingInterceptor(),
  );
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // ── Swagger (feature-gated) ─────────────────────────────────────────────────
  if (features.swagger) {
    const { DocumentBuilder, SwaggerModule } = await import('@nestjs/swagger');
    const swaggerConfig = new DocumentBuilder()
      .setTitle('NestJS Better-Auth API')
      .setDescription('Full-auth API starter — sign-up, sign-in, email verification, password reset, OAuth, Bearer token')
      .setVersion('1.0')
      .addCookieAuth('better-auth.session_token')
      .addBearerAuth({ type: 'http', scheme: 'bearer' }, 'bearer-token')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  // ── Bull Board (feature-gated + requires Redis) ─────────────────────────────
  if (features.redis && process.env.REDIS_URL) {
    const { createBullBoard } = await import('@bull-board/api');
    const { FastifyAdapter: BullBoardFastifyAdapter } = await import('@bull-board/fastify');
    const serverAdapter = new BullBoardFastifyAdapter();
    serverAdapter.setBasePath('/admin/queues');
    createBullBoard({ queues: [], serverAdapter });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await (fastify as any).register(serverAdapter.registerPlugin(), { prefix: '/admin/queues' });
  }

  const port = process.env.PORT ?? 5555;
  await app.listen(port, '0.0.0.0');

  // ── Startup banner ──────────────────────────────────────────────────────────
  console.log(`\n🚀  Server       → http://localhost:${port}`);
  console.log(`❤️   Health       → http://localhost:${port}/health`);
  if (features.swagger) console.log(`📖  Swagger      → http://localhost:${port}/docs`);
  if (features.metrics) console.log(`📊  Metrics      → http://localhost:${port}/metrics`);
  if (features.redis && process.env.REDIS_URL) console.log(`🐂  Bull Board   → http://localhost:${port}/admin/queues`);
  if (process.env.NODE_ENV !== 'production') console.log(`📧  Mailpit UI   → http://localhost:8025`);
  console.log('');
  logFeatures();
}

void bootstrap();
