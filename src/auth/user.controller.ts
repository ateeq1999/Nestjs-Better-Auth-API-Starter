import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  HttpStatus,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { auth } from './auth.config';
import { user, account } from '../db/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword } from './password.service';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('api/users')
export class UserController {
  @Get('me')
  async getCurrentUser(@Req() req: FastifyRequest) {
    const sessionData = await auth.api.getSession({
      headers: new Headers({ cookie: req.headers.cookie ?? '' }),
    });

    if (!sessionData) {
      return { user: null };
    }

    const foundUser = await db.query.user.findFirst({
      where: eq(user.id, sessionData.user.id),
    });

    if (!foundUser) {
      return { user: null };
    }

    return {
      user: {
        id: foundUser.id,
        name: foundUser.name,
        email: foundUser.email,
        emailVerified: foundUser.emailVerified,
        image: foundUser.image,
        createdAt: foundUser.createdAt,
        updatedAt: foundUser.updatedAt,
      },
    };
  }

  @Post('change-password')
  async changePassword(
    @Body() body: ChangePasswordDto,
    @Req() req: FastifyRequest,
  ) {
    const sessionData = await auth.api.getSession({
      headers: new Headers({ cookie: req.headers.cookie ?? '' }),
    });

    if (!sessionData) {
      throw new UnauthorizedException();
    }

    const foundAccount = await db.query.account.findFirst({
      where: eq(account.userId, sessionData.user.id),
    });

    if (!foundAccount?.password) {
      throw new HttpException('No password set on this account', HttpStatus.BAD_REQUEST);
    }

    // P0 fix: verify current password before allowing the change
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
