import { Injectable } from '@nestjs/common';
import { and, eq, gte, count } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { db } from '../db/index';
import { loginAttempt, accountLockout } from '../db/schema';

const MAX_ATTEMPTS = 5;           // lock after this many consecutive failures
const WINDOW_MS = 15 * 60 * 1000; // 15-minute rolling window
const LOCKOUT_MS = 30 * 60 * 1000; // locked for 30 minutes

export interface LockoutStatus {
  locked: boolean;
  lockedUntil?: Date;
  failedAttempts: number;
}

/**
 * Tracks failed sign-in attempts per email address and enforces a lockout
 * policy: after MAX_ATTEMPTS failures within WINDOW_MS, the account is locked
 * for LOCKOUT_MS.
 *
 * Usage in IdentityController:
 *   // Before calling callAuthHandler for sign-in:
 *   await this.lockout.assertNotLocked(email);
 *   // After a failed sign-in response:
 *   await this.lockout.recordFailure(email, req.ip);
 *   // After a successful sign-in response:
 *   await this.lockout.recordSuccess(email);
 */
@Injectable()
export class LockoutService {
  async getStatus(email: string): Promise<LockoutStatus> {
    const lockout = await db.query.accountLockout.findFirst({
      where: eq(accountLockout.email, email),
    });

    if (!lockout) return { locked: false, failedAttempts: 0 };

    if (lockout.lockedUntil && lockout.lockedUntil > new Date()) {
      return {
        locked: true,
        lockedUntil: lockout.lockedUntil,
        failedAttempts: lockout.failedAttempts,
      };
    }

    return { locked: false, failedAttempts: lockout.failedAttempts };
  }

  async assertNotLocked(email: string): Promise<void> {
    const status = await this.getStatus(email);
    if (status.locked) {
      const until = status.lockedUntil!.toISOString();
      throw Object.assign(new Error('Account is temporarily locked'), {
        status: 429,
        message: `Too many failed sign-in attempts. Account locked until ${until}.`,
      });
    }
  }

  async recordFailure(email: string, ipAddress?: string): Promise<void> {
    // Insert attempt record
    await db.insert(loginAttempt).values({
      id: createId(),
      email,
      ipAddress: ipAddress ?? null,
      success: false,
    });

    // Count recent failures in the rolling window
    const windowStart = new Date(Date.now() - WINDOW_MS);
    const [result] = await db
      .select({ count: count() })
      .from(loginAttempt)
      .where(
        and(
          eq(loginAttempt.email, email),
          eq(loginAttempt.success, false),
          gte(loginAttempt.createdAt, windowStart),
        ),
      );
    const recentFailures = Number(result?.count ?? 0);

    const shouldLock = recentFailures >= MAX_ATTEMPTS;
    const lockedUntil = shouldLock ? new Date(Date.now() + LOCKOUT_MS) : null;

    // Upsert lockout row
    await db
      .insert(accountLockout)
      .values({
        email,
        failedAttempts: recentFailures,
        lockedUntil,
        lastAttemptAt: new Date(),
      })
      .onConflictDoUpdate({
        target: accountLockout.email,
        set: {
          failedAttempts: recentFailures,
          lockedUntil,
          lastAttemptAt: new Date(),
        },
      });
  }

  async recordSuccess(email: string): Promise<void> {
    // Clear lockout on successful sign-in
    await db
      .insert(accountLockout)
      .values({ email, failedAttempts: 0, lockedUntil: null, lastAttemptAt: new Date() })
      .onConflictDoUpdate({
        target: accountLockout.email,
        set: { failedAttempts: 0, lockedUntil: null, lastAttemptAt: new Date() },
      });
  }
}
