import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailProcessor, EMAIL_QUEUE } from './email.processor';
import { EmailQueueService } from './email-queue.service';

/**
 * Email module — provides EmailQueueService for fire-and-forget email dispatch.
 *
 * Requires Redis. Set REDIS_URL in .env:
 *   REDIS_URL=redis://localhost:6379
 *
 * When REDIS_URL is not set the BullMQ connection will fail at startup.
 * For development without Redis, disable this module in app.module.ts and
 * call sendEmail() from email.service.ts directly.
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>('REDIS_URL') ?? 'redis://localhost:6379',
        },
      }),
    }),
    BullModule.registerQueue({ name: EMAIL_QUEUE }),
  ],
  providers: [EmailProcessor, EmailQueueService],
  exports: [EmailQueueService],
})
export class EmailModule {}
