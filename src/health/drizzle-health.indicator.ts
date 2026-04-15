import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { db } from '../db';
import { sql } from 'drizzle-orm';

@Injectable()
export class DrizzleHealthIndicator extends HealthIndicator {
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await db.execute(sql`SELECT 1`);
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        'Database check failed',
        this.getStatus(key, false, { error: String(error) }),
      );
    }
  }
}
