/**
 * Public API for the database layer.
 *
 * Import from here — not from connection.ts or schema.ts directly — so that
 * refactoring the internals doesn't ripple through the whole codebase.
 *
 * Exception: auth.config.ts must import { db } from './connection' directly
 * because it runs outside NestJS DI before the module graph is bootstrapped.
 */

// Raw connection — available for non-DI consumers (auth.config, seed scripts)
export { db, pool, type DrizzleDB } from './connection';

// NestJS injectable
export { DrizzleService } from './drizzle.service';
export { DrizzleModule } from './drizzle.module';

// Table definitions + inferred types
export * from './schema';

// Zod schemas + typed insert/select types
export * from './zod-schemas';
