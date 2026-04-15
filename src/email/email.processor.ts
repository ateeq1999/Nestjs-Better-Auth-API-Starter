import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { sendEmail, type SendEmailOptions } from '../auth/email.service';

export const EMAIL_QUEUE = 'email';

export type EmailJobData = SendEmailOptions;

/**
 * Processes outbound email jobs from the BullMQ queue.
 *
 * Decouples slow/failing SMTP from the request path (N13):
 *   - If SMTP is slow, the HTTP response returns immediately
 *   - If SMTP fails, BullMQ retries automatically (3 attempts, exponential back-off)
 *   - Failed jobs land in the dead-letter queue for inspection
 */
@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  async process(job: Job<EmailJobData>): Promise<void> {
    this.logger.log(`Sending email to ${job.data.to} [job ${job.id ?? 'unknown'}]`);
    await sendEmail(job.data);
    this.logger.log(`Email sent to ${job.data.to}`);
  }
}
