import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const cookieSecret = process.env.COOKIE_SECRET;
  if (!cookieSecret && process.env.NODE_ENV === 'production') {
    throw new Error('COOKIE_SECRET env var must be set in production');
  }

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bodyParser: false },
  );

  /**
   * Use the raw Fastify instance for plugin registration to avoid the
   * RawServerBase vs RawServerDefault type mismatch in @fastify/* plugins.
   * These plugins are typed only for HTTP/1.1 (RawServerDefault) while
   * FastifyAdapter's type is the broader RawServerBase (HTTP + HTTP2).
   */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const fastify = app.getHttpAdapter().getInstance();

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

  // Global validation — strips unknown fields, throws on invalid input
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger / OpenAPI — available at /docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('NestJS Better-Auth API')
    .setDescription(
      'Full-auth API starter — sign-up, sign-in, email verification, password reset, Google OAuth',
    )
    .setVersion('1.0')
    .addCookieAuth('better-auth.session_token')
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