import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EMAIL_QUEUE, type EmailJobData } from './email.processor';

/**
 * Dispatches email jobs to the BullMQ queue instead of sending synchronously.
 *
 * Inject this service wherever you need to send email:
 *   constructor(private readonly emailQueue: EmailQueueService) {}
 *   await this.emailQueue.send({ to, subject, html });
 *
 * The actual SMTP call happens in EmailProcessor, which runs in a separate worker.
 */
@Injectable()
export class EmailQueueService {
  constructor(@InjectQueue(EMAIL_QUEUE) private readonly queue: Queue<EmailJobData>) {}

  async send(data: EmailJobData): Promise<void> {
    await this.queue.add('send', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    });
  }
}
