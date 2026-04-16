import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { callAuthHandler } from '../utils/auth-handler.util';

class SendMagicLinkDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;
}

/**
 * Magic link — passwordless email sign-in (P10).
 *
 * POST /api/auth/magic-link/send-magic-link
 *   → validates email, sends a time-limited login link via SMTP
 *
 * GET /api/auth/magic-link/verify-magic-link?token=...
 *   → validates the token, creates a session, returns cookie / Bearer token
 *
 * Rate limited to 5 requests per 15 minutes per IP (M4).
 */
@ApiTags('Magic Link')
@Controller({ version: '1', path: 'api/auth/magic-link' })
export class MagicLinkController {
  // ─── Send ─────────────────────────────────────────────────────────────────

  @Post('send-magic-link')
  @HttpCode(HttpStatus.OK)
  // 5 requests per 15 min per IP (M4)
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } })
  @ApiOperation({ summary: 'Send a magic sign-in link to the given email address' })
  @ApiBody({ type: SendMagicLinkDto })
  @ApiResponse({ status: 200, description: 'Magic link sent (always returns 200 to prevent email enumeration)' })
  sendMagicLink(
    @Body() body: SendMagicLinkDto,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    return callAuthHandler(req, res, '/api/auth/magic-link/send-magic-link', body);
  }

  // ─── Verify ───────────────────────────────────────────────────────────────

  @Get('verify-magic-link')
  @ApiOperation({ summary: 'Verify a magic link token and establish a session' })
  @ApiQuery({ name: 'token', required: true, description: 'Token from the magic link email' })
  @ApiResponse({ status: 200, description: 'Token valid — session created' })
  @ApiResponse({ status: 302, description: 'Redirect to callbackURL if provided' })
  @ApiResponse({ status: 400, description: 'Token invalid or expired' })
  verifyMagicLink(
    @Query('token') _token: string,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    return callAuthHandler(req, res, '/api/auth/magic-link/verify-magic-link');
  }
}
