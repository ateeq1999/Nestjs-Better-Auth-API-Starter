import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, gt, isNull, sql } from 'drizzle-orm';
import { DrizzleService } from '../db/drizzle.service';
import { user, type UserRole } from '../db/schema';
import { buildCursorPage, type CursorPage, type CursorPaginationDto } from '../common/dto/pagination.dto';

export type UserProfile = {
  id: string;
  name: string | null;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: string;
  bannedAt: Date | null;
  banReason: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class UserService {
  constructor(private readonly drizzle: DrizzleService) {}

  // ─── Public (user-facing) ──────────────────────────────────────────────────

  async findById(id: string): Promise<UserProfile> {
    const found = await this.drizzle.db.query.user.findFirst({
      where: and(eq(user.id, id), isNull(user.deletedAt)),
    });
    if (!found) throw new NotFoundException(`User ${id} not found`);
    return this.toProfile(found);
  }

  async updateProfile(
    id: string,
    patch: { name?: string; image?: string | null },
  ): Promise<UserProfile> {
    const [updated] = await this.drizzle.db
      .update(user)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(user.id, id), isNull(user.deletedAt)))
      .returning();

    if (!updated) throw new NotFoundException(`User ${id} not found`);
    return this.toProfile(updated);
  }

  // ─── Admin (P13) ──────────────────────────────────────────────────────────

  async findAll(query: CursorPaginationDto): Promise<CursorPage<UserProfile>> {
    const limit = query.limit ?? 20;

    const rows = await this.drizzle.db.query.user.findMany({
      where: and(
        isNull(user.deletedAt),
        query.cursor ? gt(user.id, query.cursor) : undefined,
      ),
      orderBy: [asc(user.id)],
      limit: limit + 1,
    });

    return buildCursorPage(rows.map((r) => this.toProfile(r)), limit, (p) => p.id);
  }

  async findByIdAdmin(id: string): Promise<UserProfile> {
    const found = await this.drizzle.db.query.user.findFirst({ where: eq(user.id, id) });
    if (!found) throw new NotFoundException(`User ${id} not found`);
    return this.toProfile(found);
  }

  async updateRole(id: string, role: UserRole): Promise<UserProfile> {
    const [updated] = await this.drizzle.db
      .update(user)
      .set({ role, updatedAt: new Date() })
      .where(eq(user.id, id))
      .returning();
    if (!updated) throw new NotFoundException(`User ${id} not found`);
    return this.toProfile(updated);
  }

  async ban(id: string, reason: string): Promise<UserProfile> {
    const [updated] = await this.drizzle.db
      .update(user)
      .set({ bannedAt: new Date(), banReason: reason, updatedAt: new Date() })
      .where(eq(user.id, id))
      .returning();
    if (!updated) throw new NotFoundException(`User ${id} not found`);
    return this.toProfile(updated);
  }

  async unban(id: string): Promise<UserProfile> {
    const [updated] = await this.drizzle.db
      .update(user)
      .set({ bannedAt: null, banReason: null, updatedAt: new Date() })
      .where(eq(user.id, id))
      .returning();
    if (!updated) throw new NotFoundException(`User ${id} not found`);
    return this.toProfile(updated);
  }

  async forceVerifyEmail(id: string): Promise<UserProfile> {
    const [updated] = await this.drizzle.db
      .update(user)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(user.id, id))
      .returning();
    if (!updated) throw new NotFoundException(`User ${id} not found`);
    return this.toProfile(updated);
  }

  async softDelete(id: string): Promise<void> {
    const [updated] = await this.drizzle.db
      .update(user)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(user.id, id), isNull(user.deletedAt)))
      .returning();
    if (!updated) throw new NotFoundException(`User ${id} not found`);
  }

  async getStats(): Promise<{ total: number; banned: number; deleted: number; admins: number }> {
    const [row] = await this.drizzle.db
      .select({
        total:   sql<number>`count(*)::int`,
        banned:  sql<number>`count(*) filter (where ${user.bannedAt} is not null)::int`,
        deleted: sql<number>`count(*) filter (where ${user.deletedAt} is not null)::int`,
        admins:  sql<number>`count(*) filter (where ${user.role} = 'admin')::int`,
      })
      .from(user);
    return row ?? { total: 0, banned: 0, deleted: 0, admins: 0 };
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private toProfile(found: typeof user.$inferSelect): UserProfile {
    return {
      id:            found.id,
      name:          found.name ?? null,
      email:         found.email,
      emailVerified: found.emailVerified,
      image:         found.image ?? null,
      role:          found.role,
      bannedAt:      found.bannedAt ?? null,
      banReason:     found.banReason ?? null,
      deletedAt:     found.deletedAt ?? null,
      createdAt:     found.createdAt,
      updatedAt:     found.updatedAt,
    };
  }
}
