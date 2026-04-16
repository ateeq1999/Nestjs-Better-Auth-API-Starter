import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiCookieAuth, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserResponse } from '../responses/user.response';
import { ApiDataResponse } from '../../common/decorators/api-data-response.decorator';

/**
 * GET /v1/api/users/me
 * Returns the authenticated user from the session (no extra DB call).
 * Response is wrapped by the global ResponseEnvelopeInterceptor.
 */
@ApiTags('User')
@ApiCookieAuth('better-auth.session_token')
@ApiBearerAuth('bearer-token')
@UseGuards(AuthGuard)
@Controller({ version: '1', path: 'api/users' })
export class UserController {
  @Get('me')
  @ApiDataResponse(UserResponse)
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
  ): UserResponse {
    return {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      emailVerified: currentUser.emailVerified,
      image: currentUser.image,
      createdAt: currentUser.createdAt,
      updatedAt: currentUser.updatedAt,
    };
  }
}
