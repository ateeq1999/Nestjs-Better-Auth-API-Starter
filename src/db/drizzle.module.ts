import { Global, Module } from '@nestjs/common';
import { DrizzleService } from './drizzle.service';

/**
 * Registers DrizzleService globally.
 *
 * @Global() means every module in the app can inject DrizzleService without
 * explicitly importing DrizzleModule. Register this once in AppModule.
 *
 * Import order matters: DrizzleModule must appear before any module that
 * injects DrizzleService (put it first in AppModule imports).
 */
@Global()
@Module({
  providers: [DrizzleService],
  exports: [DrizzleService],
})
export class DrizzleModule {}
