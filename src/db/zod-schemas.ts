/**
 * Zod schemas derived from Drizzle table definitions.
 *
 * Why drizzle-zod instead of hand-written Zod:
 *   - Single source of truth: change the Drizzle column → Zod schema updates automatically
 *   - No drift between DB types and runtime validation
 *   - .extend() / .pick() / .omit() let you customise per use-case
 *
 * Pattern:
 *   selectXxxSchema — full row as returned by SELECT (all nullable columns present)
 *   insertXxxSchema — validated shape for INSERT (required fields enforced)
 *   updateXxxSchema — partial insert (all fields optional, used for PATCH)
 */
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import {
  user,
  session,
  account,
  verification,
  twoFactor,
  auditLog,
  loginAttempt,
  accountLockout,
  deviceToken,
  organization,
  member,
  invitation,
} from './schema';

// ─────────────────────────────────────────────────────────────────────────────
// User
// ─────────────────────────────────────────────────────────────────────────────

export const selectUserSchema = createSelectSchema(user);
export const insertUserSchema = createInsertSchema(user, {
  email: z.string().email('Invalid email address'),
  name: z.string().min(1).max(255).optional(),
  role: z.enum(['user', 'admin', 'moderator']).default('user'),
});
/** Partial schema for PATCH /users/me and admin updates */
export const updateUserSchema = insertUserSchema.partial().omit({ id: true, createdAt: true });

export type SelectUser = z.infer<typeof selectUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Session
// ─────────────────────────────────────────────────────────────────────────────

export const selectSessionSchema = createSelectSchema(session);
export const insertSessionSchema = createInsertSchema(session);

export type SelectSession = z.infer<typeof selectSessionSchema>;
export type InsertSession = z.infer<typeof insertSessionSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Account (OAuth / password)
// ─────────────────────────────────────────────────────────────────────────────

export const selectAccountSchema = createSelectSchema(account);
export const insertAccountSchema = createInsertSchema(account);

export type SelectAccount = z.infer<typeof selectAccountSchema>;
export type InsertAccount = z.infer<typeof insertAccountSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Verification
// ─────────────────────────────────────────────────────────────────────────────

export const selectVerificationSchema = createSelectSchema(verification);
export const insertVerificationSchema = createInsertSchema(verification);

export type SelectVerification = z.infer<typeof selectVerificationSchema>;
export type InsertVerification = z.infer<typeof insertVerificationSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Two-Factor
// ─────────────────────────────────────────────────────────────────────────────

export const selectTwoFactorSchema = createSelectSchema(twoFactor);
export const insertTwoFactorSchema = createInsertSchema(twoFactor);

export type SelectTwoFactor = z.infer<typeof selectTwoFactorSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Audit Log
// ─────────────────────────────────────────────────────────────────────────────

export const selectAuditLogSchema = createSelectSchema(auditLog);
export const insertAuditLogSchema = createInsertSchema(auditLog, {
  action: z.string().min(1).max(100),
});

export type SelectAuditLog = z.infer<typeof selectAuditLogSchema>;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Login Attempt / Account Lockout
// ─────────────────────────────────────────────────────────────────────────────

export const selectLoginAttemptSchema = createSelectSchema(loginAttempt);
export const insertLoginAttemptSchema = createInsertSchema(loginAttempt);

export const selectAccountLockoutSchema = createSelectSchema(accountLockout);
export const insertAccountLockoutSchema = createInsertSchema(accountLockout);

export type SelectLoginAttempt = z.infer<typeof selectLoginAttemptSchema>;
export type SelectAccountLockout = z.infer<typeof selectAccountLockoutSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Device Token
// ─────────────────────────────────────────────────────────────────────────────

export const selectDeviceTokenSchema = createSelectSchema(deviceToken);
export const insertDeviceTokenSchema = createInsertSchema(deviceToken, {
  platform: z.enum(['ios', 'android', 'web']),
  token: z.string().min(1),
  deviceName: z.string().max(255).optional(),
});

export type SelectDeviceToken = z.infer<typeof selectDeviceTokenSchema>;
export type InsertDeviceToken = z.infer<typeof insertDeviceTokenSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Organization / Multi-tenancy
// ─────────────────────────────────────────────────────────────────────────────

export const selectOrganizationSchema = createSelectSchema(organization);
export const insertOrganizationSchema = createInsertSchema(organization, {
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
});
export const updateOrganizationSchema = insertOrganizationSchema.partial().omit({ id: true, createdAt: true });

export type SelectOrganization = z.infer<typeof selectOrganizationSchema>;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type UpdateOrganization = z.infer<typeof updateOrganizationSchema>;

export const selectMemberSchema = createSelectSchema(member);
export const insertMemberSchema = createInsertSchema(member, {
  role: z.enum(['owner', 'admin', 'member']).default('member'),
});

export type SelectMember = z.infer<typeof selectMemberSchema>;
export type InsertMember = z.infer<typeof insertMemberSchema>;

export const selectInvitationSchema = createSelectSchema(invitation);
export const insertInvitationSchema = createInsertSchema(invitation, {
  email: z.string().email(),
  role: z.enum(['owner', 'admin', 'member']).default('member'),
  status: z.enum(['pending', 'accepted', 'rejected']).default('pending'),
});

export type SelectInvitation = z.infer<typeof selectInvitationSchema>;
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
