import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  UnauthorizedException,
  HttpException,
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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ForgetPasswordDto } from '../dto/forget-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { SignOutResponse } from '../responses/auth.response';
import { callAuthHandler } from '../utils/auth-handler.util';
import { account } from '../../db/schema';
import { db } from '../../db';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '../password.service';

/**
 * Handles all password lifecycle operations:
 *   - forget-password  (unauthenticated — sends reset email)
 *   - reset-password   (unauthenticated — consumes token from email)
 *   - change-password  (authenticated — requires current password verification)
 */
@ApiTags('Password')
@Throttle({ default: { ttl: 60_000, limit: 10 } })
@Controller({ version: '1', path: 'api/auth' })
export class PasswordController {
  /**
   * POST /api/auth/forget-password
   * Sends a password-reset email. Always returns success to prevent
   * email enumeration (better-auth behaviour).
   */
  @Post('forget-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password-reset email' })
  @ApiBody({ type: ForgetPasswordDto })
  @ApiResponse({ status: 200, description: 'Reset email sent (always returns 200)' })
  async forgetPassword(
    @Body() body: ForgetPasswordDto,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    await callAuthHandler(req, reply, '/api/auth/forget-password', body);
  }

  /**
   * POST /api/auth/reset-password
   * Resets the user's password using the token from the reset email.
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using the token from the reset email' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, type: SignOutResponse })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(
    @Body() body: ResetPasswordDto,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    await callAuthHandler(req, reply, '/api/auth/reset-password', body);
  }

  /**
   * POST /api/auth/change-password
   * Changes the password of the currently authenticated user.
   * Requires the current password to be provided and verified first.
   */
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiCookieAuth('better-auth.session_token')
  @ApiOperation({ summary: 'Change password (requires active session + current password)' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, type: SignOutResponse })
  @ApiResponse({ status: 401, description: 'Not authenticated or wrong current password' })
  async changePassword(
    @Body() body: ChangePasswordDto,
    @CurrentUser() currentUser: { id: string },
  ): Promise<{ success: boolean }> {
    const foundAccount = await db.query.account.findFirst({
      where: eq(account.userId, currentUser.id),
    });

    if (!foundAccount?.password) {
      throw new HttpException('No password set on this account', HttpStatus.BAD_REQUEST);
    }

    const isValid = await verifyPassword(body.currentPassword, foundAccount.password);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashed = await hashPassword(body.newPassword);
    await db
      .update(account)
      .set({ password: hashed, updatedAt: new Date() })
      .where(eq(account.id, foundAccount.id));

    return { success: true };
  }
}
