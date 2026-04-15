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
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const cookieSecret = process.env.COOKIE_SECRET;
  if (!cookieSecret && process.env.NODE_ENV === 'production') {
    throw new Error('COOKIE_SECRET env var must be set in production');
  }

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    // genReqId attaches a unique ID to every request — forwarded as X-Request-Id
    new FastifyAdapter({ genReqId: () => crypto.randomUUID() }),
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

  // URI versioning — controllers opt-in with @Controller({ version: '1', path: '...' })
  // Unversioned routes (health, OAuth callbacks) use VERSION_NEUTRAL
  app.enableVersioning({ type: VersioningType.URI });

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

  const port = process.env.PORT ?? 5555;
  await app.listen(port, '0.0.0.0');
  console.log(`Server      → http://localhost:${port}`);
  console.log(`Swagger UI  → http://localhost:${port}/docs`);
  console.log(`Mailpit UI  → http://localhost:8025`);
}

void bootstrap();