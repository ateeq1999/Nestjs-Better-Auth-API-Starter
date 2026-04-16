import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { db, pool, type DrizzleDB } from './connection';

/**
 * NestJS injectable wrapper around the shared Drizzle connection.
 *
 * Why use this instead of importing `db` directly:
 *   - Injectable → replaceable with a mock in unit tests via TestingModule
 *   - OnModuleDestroy → drains the pg.Pool cleanly on shutdown (no dangling connections)
 *   - DI graph → makes dependencies explicit and visible in module metadata
 *
 * Usage in a service:
 *   constructor(private readonly drizzle: DrizzleService) {}
 *   const rows = await this.drizzle.db.select().from(users).where(eq(users.id, id));
 */
@Injectable()
export class DrizzleService implements OnModuleDestroy {
  /**
   * The fully-typed Drizzle query builder.
   * Use `this.drizzle.db` in services — never import `db` from connection.ts directly.
   */
  readonly db: DrizzleDB = db;

  async onModuleDestroy(): Promise<void> {
    await pool.end();
  }
}
