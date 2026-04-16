import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { Organization, Member } from '../../db/schema';

/**
 * Injects the organization resolved by OrganizationGuard into a handler parameter.
 *
 * Usage:
 *   async myHandler(@CurrentOrganization() org: Organization) { ... }
 *
 * Returns the full Organization row. Throws if OrganizationGuard hasn't run
 * (i.e. req.organization is undefined) — always pair with OrganizationGuard.
 */
export const CurrentOrganization = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Organization => {
    const req = ctx.switchToHttp().getRequest<
      FastifyRequest & { organization?: Organization }
    >();
    return req.organization as Organization;
  },
);

/**
 * Injects the current user's membership record resolved by OrganizationGuard.
 * Useful for checking `organizationMember.role` ('owner' | 'admin' | 'member').
 *
 * Usage:
 *   async myHandler(@CurrentOrgMember() membership: Member) { ... }
 */
export const CurrentOrgMember = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Member => {
    const req = ctx.switchToHttp().getRequest<
      FastifyRequest & { organizationMember?: Member }
    >();
    return req.organizationMember as Member;
  },
);
