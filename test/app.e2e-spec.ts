import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { VersioningType } from '@nestjs/common';

/**
 * Lightweight E2E suite that boots the app and tests the health endpoint.
 *
 * The health check exercises the full NestJS + Fastify bootstrap path without
 * needing a real database: TerminusModule catches the DB error and returns 503,
 * which is still a valid response (the endpoint is reachable).
 *
 * For a full integration suite that hits a real DB, point DATABASE_URL at a
 * test PostgreSQL instance (e.g. via `docker compose up -d postgres`).
 */
describe('Health endpoint (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    // Import lazily so DB connection errors don't abort the test suite
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { AppModule } = await import('./../src/app.module');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns 200 or 503 (endpoint is reachable)', async () => {
    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({ method: 'GET', url: '/health' });

    // 200 = DB is up, 503 = DB unreachable — both mean the server started correctly
    expect([200, 503]).toContain(response.statusCode);
    const body = JSON.parse(response.body) as { status: string };
    expect(['ok', 'error']).toContain(body.status);
  });

  it('GET /docs returns 200 (Swagger UI is registered)', async () => {
    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({ method: 'GET', url: '/docs' });

    // Swagger redirects to /docs/ (301) or serves directly (200)
    expect([200, 301, 302]).toContain(response.statusCode);
  });

  it('unknown routes return 404', async () => {
    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({ method: 'GET', url: '/not-a-real-path' });

    expect(response.statusCode).toBe(404);
  });
});
