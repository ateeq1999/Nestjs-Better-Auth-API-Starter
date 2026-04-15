import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { gt, lt, sql } from 'drizzle-orm';
import { db } from '../db/index';
import { session, loginAttempt, auditLog } from '../db/schema';

/**
 * Scheduled cleanup jobs that prune stale records from the database.
 * Runs automatically when ScheduleModule is active (registered in AppModule).
 *
 * All jobs are idempotent — safe to run multiple times.
 */
@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  /**
   * Purge sessions that expired more than 30 days ago.
   * Runs every day at 02:00 UTC.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM, { name: 'purge-expired-sessions' })
  async purgeExpiredSessions(): Promise<void> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await db
      .delete(session)
      .where(lt(session.expiresAt, cutoff))
      .returning({ id: session.id });
    if (result.length > 0) {
      this.logger.log(`Purged ${result.length} expired sessions`);
    }
  }

  /**
   * Purge login attempts older than 90 days.
   * Runs every Sunday at 03:00 UTC.
   */
  @Cron('0 3 * * 0', { name: 'purge-old-login-attempts' })
  async purgeOldLoginAttempts(): Promise<void> {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const result = await db
      .delete(loginAttempt)
      .where(lt(loginAttempt.createdAt, cutoff))
      .returning({ id: loginAttempt.id });
    if (result.length > 0) {
      this.logger.log(`Purged ${result.length} old login attempts`);
    }
  }

  /**
   * Purge audit log entries older than 1 year.
   * Runs on the 1st of every month at 04:00 UTC.
   */
  @Cron('0 4 1 * *', { name: 'purge-old-audit-logs' })
  async purgeOldAuditLogs(): Promise<void> {
    const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const result = await db
      .delete(auditLog)
      .where(lt(auditLog.createdAt, cutoff))
      .returning({ id: auditLog.id });
    if (result.length > 0) {
      this.logger.log(`Purged ${result.length} old audit log entries`);
    }
  }

  /**
   * Log active session count for monitoring (daily at midnight UTC).
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { name: 'session-count-metric' })
  async logSessionCount(): Promise<void> {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(session)
      .where(gt(session.expiresAt, new Date()));
    this.logger.log(`Active sessions: ${row?.count ?? 0}`);
  }
}
