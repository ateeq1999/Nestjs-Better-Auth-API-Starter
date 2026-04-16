import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { FastifyRequest } from 'fastify';
import { db } from '../../db';
import { organization, member } from '../../db/schema';
import type { Organization, Member } from '../../db/schema';

/**
 * Scopes a request to a specific organization (P12 O4-O5).
 *
 * Reads the `X-Organization-Id` header, verifies the authenticated user is a
 * member of that organization, then attaches `req.organization` and
 * `req.organizationMember` for downstream handlers.
 *
 * Must run AFTER `AuthGuard` (which populates `req.user`).
 *
 * Usage:
 *   @UseGuards(AuthGuard, OrganizationGuard)
 *   @Controller({ version: '1', path: 'api/org/something' })
 *   export class OrgScopedController {}
 *
 * In a handler, retrieve the resolved org via the @CurrentOrganization() decorator
 * or read `req.organization` directly.
 *
 * Opt-out:
 *   If a route does NOT require org scoping (e.g. listing the user's orgs),
 *   simply omit OrganizationGuard from that controller / handler.
 */
@Injectable()
export class OrganizationGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<
      FastifyRequest & {
        user?: { id?: string };
        organization?: Organization;
        organizationMember?: Member;
      }
    >();

    const orgId = (req.headers as Record<string, string | string[] | undefined>)[
      'x-organization-id'
    ];

    if (!orgId || Array.isArray(orgId) || orgId.trim() === '') {
      throw new ForbiddenException(
        'Missing X-Organization-Id header. Include the target organization ID in every request.',
      );
    }

    const userId = req.user?.id;
    if (!userId) {
      // AuthGuard should have already thrown — this is a programming error.
      throw new ForbiddenException('User not authenticated');
    }

    // Resolve organization
    const [org] = await db
      .select()
      .from(organization)
      .where(eq(organization.id, orgId.trim()))
      .limit(1);

    if (!org) {
      throw new NotFoundException(`Organization "${orgId}" not found`);
    }

    // Verify membership
    const [membership] = await db
      .select()
      .from(member)
      .where(and(eq(member.organizationId, org.id), eq(member.userId, userId)))
      .limit(1);

    if (!membership) {
      throw new ForbiddenException(
        `You are not a member of organization "${org.name}"`,
      );
    }

    // Attach resolved context so handlers and downstream guards can use it
    req.organization = org;
    req.organizationMember = membership;

    return true;
  }
}
