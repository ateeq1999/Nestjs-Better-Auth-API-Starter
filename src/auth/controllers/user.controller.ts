import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserResponse } from '../responses/user.response';

class UserWrapper {
  user: UserResponse;
}

/**
 * Exposes the currently authenticated user's profile.
 * All routes require a valid session (enforced by AuthGuard at class level).
 */
@ApiTags('User')
@ApiCookieAuth('better-auth.session_token')
@UseGuards(AuthGuard)
@Controller('api/users')
export class UserController {
  /**
   * GET /api/users/me
   * Returns the authenticated user's profile.
   * The user object is read from the session validated by AuthGuard —
   * no additional DB call needed.
   */
  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  @ApiResponse({ status: 200, type: UserWrapper })
  @ApiResponse({ status: 401, description: 'No active session' })
  getCurrentUser(
    @CurrentUser()
    currentUser: {
      id: string;
      name: string;
      email: string;
      emailVerified: boolean;
      image: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
  ): UserWrapper {
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
}
