import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiParam,
  ApiResponse,
  ApiCookieAuth,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { db } from '../db/index';
import { deviceToken } from '../db/schema';
import { RegisterDeviceTokenDto } from './dto/device-token.dto';
import { AuditService } from '../audit/audit.service';

@ApiTags('Mobile / Device Tokens')
@ApiCookieAuth('better-auth.session_token')
@ApiBearerAuth('bearer-token')
@UseGuards(AuthGuard)
@Controller({ version: '1', path: 'api/users/me/device-tokens' })
export class DeviceTokenController {
  constructor(private readonly audit: AuditService) {}

  /**
   * POST /api/users/me/device-tokens
   * Registers or updates a push notification token for the current device.
   * If the token already exists it is re-associated with the current user
   * (handles token rotation on the client side).
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register or refresh a push notification device token' })
  @ApiBody({ type: RegisterDeviceTokenDto })
  @ApiResponse({ status: 200, description: 'Token registered' })
  async register(
    @Body() body: RegisterDeviceTokenDto,
    @CurrentUser() currentUser: { id: string },
  ): Promise<{ id: string }> {
    const id = createId();
    await db
      .insert(deviceToken)
      .values({
        id,
        userId: currentUser.id,
        token: body.token,
        platform: body.platform,
        deviceName: body.deviceName ?? null,
      })
      .onConflictDoUpdate({
        target: deviceToken.token,
        set: {
          userId: currentUser.id,
          platform: body.platform,
          deviceName: body.deviceName ?? null,
          updatedAt: new Date(),
        },
      });

    await this.audit.log({
      userId: currentUser.id,
      action: 'device_token_registered',
      metadata: { platform: body.platform },
    });

    return { id };
  }

  /**
   * DELETE /api/users/me/device-tokens/:id
   * Removes a device token. Only the owning user can delete their own tokens.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a device token' })
  @ApiParam({ name: 'id', description: 'Device token record ID' })
  @ApiResponse({ status: 204, description: 'Token removed' })
  @ApiResponse({ status: 403, description: 'Token belongs to another user' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: { id: string },
  ): Promise<void> {
    const existing = await db.query.deviceToken.findFirst({
      where: eq(deviceToken.id, id),
    });

    if (existing && existing.userId !== currentUser.id) {
      throw new ForbiddenException('Cannot delete a token belonging to another user');
    }

    await db.delete(deviceToken).where(eq(deviceToken.id, id));

    await this.audit.log({
      userId: currentUser.id,
      action: 'device_token_removed',
    });
  }
}
