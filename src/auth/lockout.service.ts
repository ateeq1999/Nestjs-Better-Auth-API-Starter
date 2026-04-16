import { Injectable } from '@nestjs/common';
import { and, eq, gte, count } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { DrizzleService } from '../db/drizzle.service';
import { loginAttempt, accountLockout, user } from '../db/schema';
import { sendEmail } from './email.service';
import { renderEmail } from '../email/template.service';

const MAX_ATTEMPTS = 5;           // lock after this many consecutive failures
const WINDOW_MS = 15 * 60 * 1000; // 15-minute rolling window
const LOCKOUT_MS = 30 * 60 * 1000; // locked for 30 minutes

export interface LockoutStatus {
  locked: boolean;
  lockedUntil?: Date;
  failedAttempts: number;
}

@Injectable()
export class LockoutService {
  constructor(private readonly drizzle: DrizzleService) {}

  async getStatus(email: string): Promise<LockoutStatus> {
    const lockout = await this.drizzle.db.query.accountLockout.findFirst({
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
    await this.drizzle.db.insert(loginAttempt).values({
      id: createId(),
      email,
      ipAddress: ipAddress ?? null,
      success: false,
    });

    const windowStart = new Date(Date.now() - WINDOW_MS);
    const [result] = await this.drizzle.db
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

    await this.drizzle.db
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

    if (shouldLock) {
      void this.sendLockoutAlert(email, recentFailures, ipAddress).catch(() => {/* non-critical */});
    }
  }

  private async sendLockoutAlert(
    email: string,
    failedAttempts: number,
    ipAddress?: string,
  ): Promise<void> {
    const found = await this.drizzle.db.query.user.findFirst({ where: eq(user.email, email) });
    const resetUrl = `${process.env.BETTER_AUTH_URL ?? 'http://localhost:5555'}/api/auth/forget-password`;
    const { html, text } = renderEmail({
      template: 'lockout-alert',
      subject: 'Your account has been temporarily locked',
      data: {
        name: found?.name ?? email,
        email,
        failedAttempts,
        ipAddress: ipAddress ?? 'unknown',
        timestamp: new Date().toUTCString(),
        resetUrl,
      },
    });
    await sendEmail({ to: email, subject: 'Your account has been temporarily locked', html, text });
  }

  async recordSuccess(email: string): Promise<void> {
    await this.drizzle.db
      .insert(accountLockout)
      .values({ email, failedAttempts: 0, lockedUntil: null, lastAttemptAt: new Date() })
      .onConflictDoUpdate({
        target: accountLockout.email,
        set: { failedAttempts: 0, lockedUntil: null, lastAttemptAt: new Date() },
      });
  }
}
