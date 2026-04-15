import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CursorPaginationDto } from '../common/dto/pagination.dto';
import { UserService } from './user.service';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';
import type { UserRole } from '../db/schema';

@ApiTags('Admin — Users')
@ApiCookieAuth('better-auth.session_token')
@ApiBearerAuth('bearer-token')
@ApiForbiddenResponse({ description: 'Requires role: admin' })
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
@Controller({ version: '1', path: 'api/admin/users' })
export class AdminController {
  constructor(private readonly users: UserService) {}

  // ─── Stats ─────────────────────────────────────────────────────────────────

  @Get('stats')
  @ApiOperation({ summary: 'Get aggregate user stats (admin only)' })
  @ApiResponse({ status: 200, description: 'Total, banned, deleted, admin counts' })
  getStats() {
    return this.users.getStats();
  }

  // ─── List ──────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List all users — cursor-paginated (admin only)' })
  @ApiResponse({ status: 200, description: 'Paginated user list' })
  listUsers(@Query() query: CursorPaginationDto) {
    return this.users.findAll(query);
  }

  // ─── Detail ────────────────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Get user detail by ID (admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User profile' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUser(@Param('id') id: string) {
    return this.users.findByIdAdmin(id);
  }

  // ─── Update (role / ban / unban / force-verify) ───────────────────────────

  @Patch(':id')
  @ApiOperation({ summary: 'Update user role, ban, unban, or force-verify email (admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Updated user profile' })
  @ApiResponse({ status: 400, description: 'Invalid update payload' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserAdminDto) {
    if (dto.role) {
      return this.users.updateRole(id, dto.role as UserRole);
    }
    if (dto.banReason) {
      return this.users.ban(id, dto.banReason);
    }
    if (dto.unban) {
      return this.users.unban(id);
    }
    if (dto.forceVerifyEmail) {
      return this.users.forceVerifyEmail(id);
    }
    throw new BadRequestException('No valid update field provided');
  }

  // ─── Soft Delete ──────────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a user (admin only). Sets deletedAt — not permanent.' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 204, description: 'User soft-deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(@Param('id') id: string) {
    await this.users.softDelete(id);
  }
}
