import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { ApiTags } from '@nestjs/swagger';
import { DrizzleHealthIndicator } from './drizzle-health.indicator';

@ApiTags('health')
@Controller({ version: VERSION_NEUTRAL, path: 'health' })
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private drizzle: DrizzleHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([() => this.drizzle.isHealthy('database')]);
  }
}
