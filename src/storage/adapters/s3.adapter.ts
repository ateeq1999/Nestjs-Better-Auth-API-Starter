import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import type { StorageService } from '../storage.interface';

export interface S3Config {
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** For Cloudflare R2: https://<accountId>.r2.cloudflarestorage.com */
  endpoint?: string;
  /** Public base URL for constructing file URLs */
  publicUrl: string;
}

/**
 * AWS S3 storage adapter (STORAGE_DRIVER=s3).
 * Also works as a Cloudflare R2 adapter (STORAGE_DRIVER=r2) — same SDK,
 * just set endpoint to your R2 endpoint URL.
 *
 * Required env vars (S3):
 *   AWS_REGION=us-east-1
 *   AWS_BUCKET=my-bucket
 *   AWS_ACCESS_KEY_ID=...
 *   AWS_SECRET_ACCESS_KEY=...
 *   AWS_PUBLIC_URL=https://my-bucket.s3.us-east-1.amazonaws.com
 *
 * Required env vars (R2):
 *   R2_ACCOUNT_ID=...
 *   R2_BUCKET=my-bucket
 *   R2_ACCESS_KEY_ID=...
 *   R2_SECRET_ACCESS_KEY=...
 *   R2_PUBLIC_URL=https://pub-xxx.r2.dev  (or custom domain)
 *   (set endpoint = https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com)
 */
@Injectable()
export class S3StorageAdapter implements StorageService {
  private readonly logger = new Logger(S3StorageAdapter.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(config: S3Config) {
    this.bucket = config.bucket;
    this.publicUrl = config.publicUrl.replace(/\/$/, '');
    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      ...(config.endpoint ? { endpoint: config.endpoint } : {}),
    });
  }

  async upload(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      },
    });
    await upload.done();
    this.logger.debug(`Uploaded ${key} to S3 bucket ${this.bucket}`);
    return this.getUrl(key);
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  getUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }
}
