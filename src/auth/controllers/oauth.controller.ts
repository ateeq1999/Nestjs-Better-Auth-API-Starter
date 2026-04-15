import { All, Controller, Get, Param, Req, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { callAuthHandler } from '../utils/auth-handler.util';
import { auth } from '../auth.config';

/**
 * Handles OAuth / social-provider flows.
 *
 * OAuth is redirect-based — the browser follows Location headers across
 * Google's auth servers and back. callAuthHandler forwards those redirects
 * transparently, so no custom redirect logic is needed here.
 *
 * Only active when GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET are set in .env.
 */
@ApiTags('OAuth')
@Throttle({ default: { ttl: 60_000, limit: 20 } })
@Controller('api/auth')
export class OAuthController {
  /**
   * GET /api/auth/sign-in/social?provider=google
   * Initiates the OAuth flow. Redirects the browser to the provider's
   * consent screen (302). The `callbackURL` query param controls where
   * the browser is sent after successful auth.
   *
   * Example:
   *   GET /api/auth/sign-in/social?provider=google&callbackURL=http://localhost:5173/dashboard
   */
  @Get('sign-in/social')
  @ApiOperation({ summary: 'Initiate social / OAuth sign-in (redirects to provider)' })
  @ApiQuery({ name: 'provider', example: 'google', description: 'OAuth provider identifier' })
  @ApiQuery({
    name: 'callbackURL',
    required: false,
    description: 'Frontend URL to redirect to after successful auth',
    example: 'http://localhost:5173/dashboard',
  })
  @ApiQuery({
    name: 'errorCallbackURL',
    required: false,
    description: 'Frontend URL to redirect to on auth failure',
  })
  @ApiResponse({ status: 302, description: 'Redirect to provider consent screen' })
  async signInSocial(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    await callAuthHandler(req, reply, '/api/auth/sign-in/social');
  }

  /**
   * GET /api/auth/callback/:provider
   * OAuth callback — called by the provider after the user grants consent.
   * better-auth exchanges the code for tokens, creates/updates the user record,
   * sets the session cookie, and redirects to callbackURL.
   */
  @Get('callback/:provider')
  @ApiOperation({ summary: 'OAuth callback (called by the provider, not directly by clients)' })
  @ApiParam({ name: 'provider', example: 'google' })
  @ApiResponse({ status: 302, description: 'Redirect to callbackURL with session cookie set' })
  async handleCallback(
    @Param('provider') _provider: string,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    await callAuthHandler(req, reply, `/api/auth/callback/${_provider}`);
  }

  /**
   * Catch-all for any remaining better-auth internal routes
   * (e.g. token refresh, PKCE helpers, future plugin routes).
   * Excluded from Swagger — clients should use the explicit routes above.
   */
  @All('*')
  @ApiExcludeEndpoint()
  async handleInternal(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    // Pass the request through to better-auth unchanged — path is taken from req.url
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
    if (hasBody) headers.set('content-type', 'application/json');

    const response = await auth.handler(
      new Request(url.toString(), {
        method: req.method,
        headers,
        body: hasBody ? JSON.stringify(req.body) : undefined,
      }),
    );

    void reply.status(response.status);
    for (const [key, value] of response.headers.entries()) {
      void reply.header(key, value);
    }
    const text = await response.text();
    if (text) {
      try { void reply.send(JSON.parse(text) as unknown); }
      catch { void reply.send(text); }
    } else {
      void reply.send(null);
    }
  }
}
