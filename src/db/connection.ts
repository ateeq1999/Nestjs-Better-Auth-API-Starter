/**
 * Raw database connection — framework-agnostic singleton.
 *
 * This file intentionally has NO NestJS imports. It creates the pg.Pool and
 * Drizzle instance once at process startup. Two consumers:
 *
 *   1. DrizzleService (src/db/drizzle.service.ts) — wraps this for DI + pool lifecycle
 *   2. auth.config.ts — better-auth lives outside NestJS DI so it imports directly
 *
 * All other code should inject DrizzleService instead of importing from here.
 */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Sane pool defaults — tune via env if needed
  max: Number(process.env.DB_POOL_MAX ?? 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });

/** Convenience type alias used throughout the codebase. */
export type DrizzleDB = typeof db;
