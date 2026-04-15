import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiCookieAuth,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { SignUpDto } from '../dto/sign-up.dto';
import { SignInDto } from '../dto/sign-in.dto';
import { AuthResponse, SignOutResponse } from '../responses/auth.response';
import { SessionResponse } from '../responses/session.response';
import { callAuthHandler } from '../utils/auth-handler.util';
import { LockoutService } from '../lockout.service';
import { AuditService } from '../../audit/audit.service';

/**
 * Handles core identity operations: registration, authentication, and session management.
 *
 * Every method delegates to better-auth's internal handler via callAuthHandler,
 * so all hooks (sendVerificationEmail, cookieCache, etc.) fire correctly.
 *
 * Sign-in additionally enforces account lockout (S2) and records audit events (S8).
 */
@ApiTags('Identity')
@Throttle({ default: { ttl: 60_000, limit: 20 } })
@Controller({ version: '1', path: 'api/auth' })
export class IdentityController {
  constructor(
    private readonly lockout: LockoutService,
    private readonly audit: AuditService,
  ) {}

  /**
   * POST /v1/api/auth/sign-up
   * Registers a new user. When requireEmailVerification is enabled,
   * `token` in the response is null until the user verifies their email.
   */
  @Post('sign-up')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register a new user with email and password' })
  @ApiBody({ type: SignUpDto })
  @ApiResponse({ status: 200, type: AuthResponse })
  @ApiResponse({ status: 422, description: 'Email already in use' })
  async signUp(
    @Body() body: SignUpDto,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    await callAuthHandler(req, reply, '/api/auth/sign-up/email', body);
    await this.audit.log(this.audit.fromRequest(req, { action: 'sign_up' }));
  }

  /**
   * POST /v1/api/auth/sign-in
   * Authenticates an existing user. Sets a session cookie on success.
   * Returns 403 if email is not yet verified.
   * Returns 429 if the account is locked due to too many failed attempts.
   *
   * Supports both cookie (web) and bearer token (mobile) auth flows.
   * To receive a bearer token, append `?token=true` to the URL.
   */
  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearer-token')
  @ApiOperation({ summary: 'Sign in with email and password (cookie or bearer token)' })
  @ApiBody({ type: SignInDto })
  @ApiResponse({ status: 200, type: AuthResponse })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Email not verified' })
  @ApiResponse({ status: 429, description: 'Account locked — too many failed attempts' })
  async signIn(
    @Body() body: SignInDto,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    // Reject immediately if the account is locked (S2)
    await this.lockout.assertNotLocked(body.email).catch((err: { status?: number; message?: string }) => {
      throw new HttpException(err.message ?? 'Account locked', err.status ?? 429);
    });

    // Delegate to better-auth — it handles password verification, session creation, etc.
    await callAuthHandler(req, reply, '/api/auth/sign-in/email', body);

    // Record outcome — better-auth returns 401 on bad credentials so we check the reply status
    const status = (reply as unknown as { statusCode: number }).statusCode;
    if (status === 200) {
      await Promise.all([
        this.lockout.recordSuccess(body.email),
        this.audit.log(this.audit.fromRequest(req, { action: 'sign_in' })),
      ]);
    } else if (status === 401) {
      await Promise.all([
        this.lockout.recordFailure(body.email, req.ip),
        this.audit.log(this.audit.fromRequest(req, { action: 'sign_in_failed', metadata: { email: body.email } })),
      ]);
    }
  }

  /**
   * POST /v1/api/auth/sign-out
   * Invalidates the current session and clears the session cookie.
   * Also accepts a Bearer token in the Authorization header (mobile clients).
   */
  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('better-auth.session_token')
  @ApiBearerAuth('bearer-token')
  @ApiOperation({ summary: 'Sign out and invalidate the current session' })
  @ApiResponse({ status: 200, type: SignOutResponse })
  @ApiResponse({ status: 401, description: 'No active session' })
  async signOut(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    await callAuthHandler(req, reply, '/api/auth/sign-out');
  }

  /**
   * GET /v1/api/auth/session
   * Returns the session and user for the current cookie or Bearer token.
   * Returns { session: null, user: null } when unauthenticated.
   */
  @Get('session')
  @ApiCookieAuth('better-auth.session_token')
  @ApiBearerAuth('bearer-token')
  @ApiOperation({ summary: 'Get the current session and authenticated user' })
  @ApiResponse({ status: 200, type: SessionResponse })
  @ApiResponse({ status: 200, description: '{ session: null, user: null } when unauthenticated' })
  async getSession(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    await callAuthHandler(req, reply, '/api/auth/get-session');
  }
}
