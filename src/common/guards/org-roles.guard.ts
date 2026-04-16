import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { ORG_ROLES_KEY, type OrgMemberRole } from '../decorators/org-roles.decorator';
import type { Member } from '../../db/schema';

/**
 * Checks that the current organization member has one of the roles declared
 * via @OrgRoles().
 *
 * Must run AFTER OrganizationGuard (which populates req.organizationMember).
 *
 * If no @OrgRoles() decorator is present the guard passes — membership
 * alone (verified by OrganizationGuard) is sufficient.
 *
 * Usage:
 *   @UseGuards(AuthGuard, OrganizationGuard, OrgRolesGuard)
 *   @OrgRoles('owner', 'admin')
 *   async transferOwnership() { ... }
 */
@Injectable()
export class OrgRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<OrgMemberRole[]>(ORG_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<
      FastifyRequest & { organizationMember?: Member }
    >();
    const memberRole = req.organizationMember?.role as OrgMemberRole | undefined;

    if (!memberRole || !required.includes(memberRole)) {
      throw new ForbiddenException(
        `Requires organization role: [${required.join(', ')}]. Your role: ${memberRole ?? 'none'}`,
      );
    }

    return true;
  }
}
