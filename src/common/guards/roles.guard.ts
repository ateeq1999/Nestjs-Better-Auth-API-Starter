import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { UserRole } from '../../db/schema';

/**
 * Checks that the authenticated user has one of the roles declared via @Roles().
 *
 * Must run AFTER AuthGuard (which populates req.user).
 *
 * Usage:
 *   @UseGuards(AuthGuard, RolesGuard)
 *   @Roles('admin')
 *   @Controller({ version: '1', path: 'api/admin/users' })
 *   export class AdminController {}
 *
 * If no @Roles() decorator is present, the guard passes (non-role-gated route).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const req = context.switchToHttp().getRequest<FastifyRequest & { user?: { role?: string } }>();
    const userRole = req.user?.role ?? 'user';

    if (!requiredRoles.includes(userRole as UserRole)) {
      throw new ForbiddenException(
        `Requires one of: [${requiredRoles.join(', ')}]. Your role: ${userRole}`,
      );
    }

    return true;
  }
}
