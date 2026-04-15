import {
  Controller,
  Get,
  Post,
  Body,
  HttpStatus,
  HttpException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { account } from '../db/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword } from './password.service';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('api/users')
@UseGuards(AuthGuard)
export class UserController {
  @Get('me')
  getCurrentUser(@CurrentUser() currentUser: { id: string; name: string; email: string; emailVerified: boolean; image: string | null; createdAt: Date; updatedAt: Date }) {
    // Session already validated by AuthGuard — just return the user from context
    return {
      user: {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        emailVerified: currentUser.emailVerified,
        image: currentUser.image,
        createdAt: currentUser.createdAt,
        updatedAt: currentUser.updatedAt,
      },
    };
  }

  @Post('change-password')
  async changePassword(
    @Body() body: ChangePasswordDto,
    @CurrentUser() currentUser: { id: string },
  ) {
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
