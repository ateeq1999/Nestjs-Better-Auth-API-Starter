import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '../../db/schema';

export const ROLES_KEY = 'roles';

/**
 * Declare which roles are allowed to access a route or controller.
 *
 * Usage:
 *   @Roles('admin')               // admin only
 *   @Roles('admin', 'moderator')  // either role
 *
 * Must be combined with AuthGuard + RolesGuard:
 *   @UseGuards(AuthGuard, RolesGuard)
 *   @Roles('admin')
 *   @Controller(...)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
