import { SetMetadata } from '@nestjs/common';

/**
 * Member roles within an organization (not the same as global UserRole).
 */
export type OrgMemberRole = 'owner' | 'admin' | 'member';

export const ORG_ROLES_KEY = 'orgRoles';

/**
 * Restricts a route to organization members with the specified role(s).
 * Must be combined with OrganizationGuard which resolves req.organizationMember.
 *
 * Usage:
 *   @UseGuards(AuthGuard, OrganizationGuard, OrgRolesGuard)
 *   @OrgRoles('owner', 'admin')
 *   async deleteOrg() { ... }
 */
export const OrgRoles = (...roles: OrgMemberRole[]) => SetMetadata(ORG_ROLES_KEY, roles);
