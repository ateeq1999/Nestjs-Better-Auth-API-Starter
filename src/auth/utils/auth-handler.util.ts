import type { FastifyReply, FastifyRequest } from 'fastify';
import { auth } from '../auth.config';

/**
 * Bridges an explicit NestJS controller method to better-auth's internal handler.
 *
 * Strategy (Approach C — hybrid):
 *   1. The NestJS route handles the request — ValidationPipe runs on the @Body() DTO.
 *   2. This utility constructs a Web API Request pointing at the correct better-auth
 *      internal path (e.g. /api/auth/sign-up/email) and forwards the validated body.
 *   3. better-auth executes its auth logic (hashing, session creation, email hooks…).
 *   4. The full Web API Response (status, Set-Cookie headers, body) is forwarded
 *      back to the Fastify reply — no manual cookie management needed.
 *
 * @param req         Raw Fastify request (provides headers / query params)
 * @param reply       Raw Fastify reply (caller must NOT have passthrough:true)
 * @param authPath    The internal better-auth path, e.g. '/api/auth/sign-up/email'
 * @param body        The validated DTO to use as request body (replaces req.body)
 */
export async function callAuthHandler(
  req: FastifyRequest,
  reply: FastifyReply,
  authPath: string,
  body?: unknown,
): Promise<void> {
  const baseUrl =
    process.env.BETTER_AUTH_URL || `http://localhost:${process.env.PORT ?? 5555}`;

  // Build target URL — preserve query params from the original request
  const target = new URL(authPath, baseUrl);
  const source = new URL(req.url, baseUrl);
  source.searchParams.forEach((value, key) => target.searchParams.set(key, value));

  // Forward request headers — strip hop-by-hop and internal proxy headers
  // to prevent header injection attacks from upstream proxies or clients.
  const BLOCKED_HEADERS = new Set([
    'x-forwarded-for',
    'x-forwarded-host',
    'x-forwarded-proto',
    'x-forwarded-port',
    'x-real-ip',
    'x-cluster-client-ip',
    'forwarded',
    'via',
    'proxy-authorization',
    'proxy-connection',
    'te',
    'trailers',
    'transfer-encoding',
    'upgrade',
  ]);

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined && !BLOCKED_HEADERS.has(key.toLowerCase())) {
      headers.set(key, Array.isArray(value) ? value.join(', ') : String(value));
    }
  }

  const resolvedBody = body ?? req.body;
  const isBodyMethod = req.method !== 'GET' && req.method !== 'HEAD';
  const hasBody = isBodyMethod && resolvedBody != null;
  if (hasBody) headers.set('content-type', 'application/json');

  const webRequest = new Request(target.toString(), {
    method: req.method,
    headers,
    body: hasBody ? JSON.stringify(resolvedBody) : undefined,
  });

  const response = await auth.handler(webRequest);

  void reply.status(response.status);
  for (const [key, value] of response.headers.entries()) {
    void reply.header(key, value);
  }

  const text = await response.text();
  if (text) {
    try {
      void reply.send(JSON.parse(text) as unknown);
    } catch {
      void reply.send(text);
    }
  } else {
    void reply.send(null);
  }
}
