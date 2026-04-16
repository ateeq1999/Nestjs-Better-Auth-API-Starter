import { Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gt } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import type { FastifyRequest } from 'fastify';
import { DrizzleService } from '../db/drizzle.service';
import { auditLog } from '../db/schema';
import { buildCursorPage, type CursorPage, type CursorPaginationDto } from '../common/dto/pagination.dto';

export type AuditAction =
  | 'sign_up'
  | 'sign_in'
  | 'sign_out'
  | 'sign_in_failed'
  | 'account_locked'
  | 'account_unlocked'
  | 'email_verified'
  | 'password_changed'
  | 'password_reset_requested'
  | 'password_reset'
  | 'two_factor_enabled'
  | 'two_factor_disabled'
  | 'oauth_sign_in'
  | 'device_token_registered'
  | 'device_token_removed';

export interface AuditEntry {
  userId?: string | null;
  action: AuditAction;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private readonly drizzle: DrizzleService) {}

  async log(entry: AuditEntry): Promise<void> {
    await this.drizzle.db.insert(auditLog).values({
      id: createId(),
      userId: entry.userId ?? null,
      action: entry.action,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    });
  }

  fromRequest(req: FastifyRequest, entry: Omit<AuditEntry, 'ipAddress' | 'userAgent'>): AuditEntry {
    return {
      ...entry,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] ?? undefined,
    };
  }

  // ─── Admin (PG3) ──────────────────────────────────────────────────────────

  async findAll(
    query: CursorPaginationDto & { userId?: string },
  ): Promise<CursorPage<typeof auditLog.$inferSelect>> {
    const limit = query.limit ?? 20;

    const rows = await this.drizzle.db
      .select()
      .from(auditLog)
      .where(
        and(
          query.cursor ? gt(auditLog.id, query.cursor) : undefined,
          query.userId ? eq(auditLog.userId, query.userId) : undefined,
        ),
      )
      .orderBy(desc(auditLog.createdAt), asc(auditLog.id))
      .limit(limit + 1);

    return buildCursorPage(rows, limit, (r) => r.id);
  }
}
