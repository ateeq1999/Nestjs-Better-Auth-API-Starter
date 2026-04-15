import {
  pgTable,
  varchar,
  timestamp,
  boolean,
  text,
  integer,
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Core better-auth tables
// ---------------------------------------------------------------------------

export const user = pgTable('users', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: varchar('image', { length: 500 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  // Two-factor auth fields (populated by better-auth twoFactor plugin)
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  // RBAC (P11)
  role: varchar('role', { length: 50 }).notNull().default('user'), // 'user' | 'admin' | 'moderator'
  // Admin management (P13)
  bannedAt: timestamp('banned_at'),
  banReason: text('ban_reason'),
  deletedAt: timestamp('deleted_at'), // soft-delete
});

export const session = pgTable('sessions', {
  id: varchar('id', { length: 255 }).primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 255 }),
  userAgent: text('user_agent'),
  userId: varchar('user_id', { length: 255 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('accounts', {
  id: varchar('id', { length: 255 }).primaryKey(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  providerId: varchar('provider_id', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 255 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verification = pgTable('verifications', {
  id: varchar('id', { length: 255 }).primaryKey(),
  identifier: varchar('identifier', { length: 255 }).notNull(),
  value: varchar('value', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ---------------------------------------------------------------------------
// Two-factor auth (better-auth twoFactor plugin)
// ---------------------------------------------------------------------------

export const twoFactor = pgTable('two_factor', {
  id: varchar('id', { length: 255 }).primaryKey(),
  secret: text('secret').notNull(),
  backupCodes: text('backup_codes').notNull(),
  userId: varchar('user_id', { length: 255 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

// ---------------------------------------------------------------------------
// Audit log — records auth events for compliance / security monitoring
// ---------------------------------------------------------------------------

export const auditLog = pgTable('audit_logs', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 255 }).references(() => user.id, {
    onDelete: 'set null',
  }),
  action: varchar('action', { length: 100 }).notNull(),
  ipAddress: varchar('ip_address', { length: 255 }),
  userAgent: text('user_agent'),
  metadata: text('metadata'),           // JSON string of extra context
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Account lockout — tracks failed sign-in attempts per email
// ---------------------------------------------------------------------------

export const loginAttempt = pgTable('login_attempts', {
  id: varchar('id', { length: 255 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  ipAddress: varchar('ip_address', { length: 255 }),
  success: boolean('success').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const accountLockout = pgTable('account_lockouts', {
  email: varchar('email', { length: 255 }).primaryKey(),
  failedAttempts: integer('failed_attempts').notNull().default(0),
  lockedUntil: timestamp('locked_until'),
  lastAttemptAt: timestamp('last_attempt_at').notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Device tokens — push notification tokens per user device
// ---------------------------------------------------------------------------

export const deviceToken = pgTable('device_tokens', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 255 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  platform: varchar('platform', { length: 50 }).notNull(), // 'ios' | 'android' | 'web'
  deviceName: varchar('device_name', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// TypeScript types
// ---------------------------------------------------------------------------

export type UserRole = 'user' | 'admin' | 'moderator';
export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
export type Account = typeof account.$inferSelect;
export type Verification = typeof verification.$inferSelect;
export type TwoFactor = typeof twoFactor.$inferSelect;
export type AuditLog = typeof auditLog.$inferSelect;
export type LoginAttempt = typeof loginAttempt.$inferSelect;
export type AccountLockout = typeof accountLockout.$inferSelect;
export type DeviceToken = typeof deviceToken.$inferSelect;
