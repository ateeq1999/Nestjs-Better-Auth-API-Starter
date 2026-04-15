import { All, Controller, Req, Res } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { auth } from './auth.config';

/**
 * Delegates every /api/auth/* request to better-auth's built-in handler.
 * This ensures all hooks fire correctly (e.g. sendVerificationEmail on sign-up,
 * sendResetPasswordEmail on forget-password) and removes duplicated auth logic.
 *
 * Available endpoints (provided by better-auth out of the box):
 *   POST /api/auth/sign-up/email
 *   POST /api/auth/sign-in/email
 *   POST /api/auth/sign-out
 *   GET  /api/auth/get-session
 *   POST /api/auth/verify-email
 *   POST /api/auth/forget-password
 *   POST /api/auth/reset-password
 */
@Controller('api/auth')
export class AuthController {
  @All('*')
  async handle(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const baseUrl =
      process.env.BETTER_AUTH_URL || `http://localhost:${process.env.PORT ?? 5555}`;

    const url = new URL(req.url, baseUrl);

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined) {
        headers.set(key, Array.isArray(value) ? value.join(', ') : String(value));
      }
    }

    const hasBody = req.method !== 'GET' && req.method !== 'HEAD' && req.body != null;
    if (hasBody && !headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }

    const webRequest = new Request(url.toString(), {
      method: req.method,
      headers,
      body: hasBody ? JSON.stringify(req.body) : undefined,
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
}
