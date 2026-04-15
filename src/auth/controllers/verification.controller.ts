import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
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
import { AuthGuard } from '../../common/guards/auth.guard';
import { VerifyEmailDto, SendVerificationEmailDto } from '../dto/verify-email.dto';
import { SignOutResponse } from '../responses/auth.response';
import { callAuthHandler } from '../utils/auth-handler.util';

/**
 * Handles email address verification flows:
 *   - verify-email              (consumes token from the verification email link)
 *   - send-verification-email   (re-sends the link; requires an active session)
 */
@ApiTags('Verification')
@Throttle({ default: { ttl: 60_000, limit: 10 } })
@Controller('api/auth')
export class VerificationController {
  /**
   * POST /api/auth/verify-email
   * Marks the email as verified using the token from the verification email.
   * Unauthenticated — called from the link the user receives in their inbox.
   */
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address using the token from the verification email' })
  @ApiBody({ type: VerifyEmailDto })
  @ApiResponse({ status: 200, type: SignOutResponse })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(
    @Body() body: VerifyEmailDto,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    await callAuthHandler(req, reply, '/api/auth/verify-email', body);
  }

  /**
   * POST /api/auth/send-verification-email
   * Re-sends the verification email to the authenticated user.
   * Requires an active session (user must be signed in but not yet verified).
   */
  @Post('send-verification-email')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiCookieAuth('better-auth.session_token')
  @ApiOperation({ summary: 'Re-send the verification email (requires active session)' })
  @ApiBody({ type: SendVerificationEmailDto })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  @ApiResponse({ status: 401, description: 'No active session' })
  async sendVerificationEmail(
    @Body() body: SendVerificationEmailDto,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    await callAuthHandler(req, reply, '/api/auth/send-verification-email', body);
  }
}
