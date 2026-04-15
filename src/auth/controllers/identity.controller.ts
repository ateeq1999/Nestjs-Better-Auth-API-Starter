import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { SignUpDto } from '../dto/sign-up.dto';
import { SignInDto } from '../dto/sign-in.dto';
import { AuthResponse, SignOutResponse } from '../responses/auth.response';
import { SessionResponse } from '../responses/session.response';
import { callAuthHandler } from '../utils/auth-handler.util';

/**
 * Handles core identity operations: registration, authentication, and session management.
 *
 * Every method delegates to better-auth's internal handler via callAuthHandler,
 * so all hooks (sendVerificationEmail, cookieCache, etc.) fire correctly.
 */
@ApiTags('Identity')
@Throttle({ default: { ttl: 60_000, limit: 20 } })
@Controller('api/auth')
export class IdentityController {
  /**
   * POST /api/auth/sign-up
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
  }

  /**
   * POST /api/auth/sign-in
   * Authenticates an existing user. Sets a session cookie on success.
   * Returns 403 if email is not yet verified.
   */
  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiBody({ type: SignInDto })
  @ApiResponse({ status: 200, type: AuthResponse })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Email not verified' })
  async signIn(
    @Body() body: SignInDto,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    await callAuthHandler(req, reply, '/api/auth/sign-in/email', body);
  }

  /**
   * POST /api/auth/sign-out
   * Invalidates the current session and clears the session cookie.
   */
  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign out and invalidate the current session' })
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 200, type: SignOutResponse })
  @ApiResponse({ status: 401, description: 'No active session' })
  async signOut(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    await callAuthHandler(req, reply, '/api/auth/sign-out');
  }

  /**
   * GET /api/auth/session
   * Returns the session and user for the current cookie.
   * Returns null for both if no valid session exists.
   */
  @Get('session')
  @ApiOperation({ summary: 'Get the current session and authenticated user' })
  @ApiCookieAuth('better-auth.session_token')
  @ApiResponse({ status: 200, type: SessionResponse })
  @ApiResponse({ status: 200, description: '{ session: null, user: null } when unauthenticated' })
  async getSession(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    await callAuthHandler(req, reply, '/api/auth/get-session');
  }
}
