import { Injectable, Logger } from '@nestjs/common';
import { Client as MinioClient } from 'minio';
import type { StorageService } from '../storage.interface';

export interface MinioConfig {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
  publicUrl: string; // e.g. http://localhost:9000/uploads
}

/**
 * MinIO storage adapter (STORAGE_DRIVER=minio).
 *
 * Self-hosted S3-compatible object storage.
 * Start locally with: docker compose up minio
 *
 * Required env vars:
 *   MINIO_ENDPOINT=localhost
 *   MINIO_PORT=9000
 *   MINIO_USE_SSL=false
 *   MINIO_ACCESS_KEY=minioadmin
 *   MINIO_SECRET_KEY=minioadmin
 *   MINIO_BUCKET=uploads
 *   MINIO_PUBLIC_URL=http://localhost:9000/uploads
 */
@Injectable()
export class MinioStorageAdapter implements StorageService {
  private readonly logger = new Logger(MinioStorageAdapter.name);
  private readonly client: MinioClient;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(config: MinioConfig) {
    this.bucket = config.bucket;
    this.publicUrl = config.publicUrl.replace(/\/$/, '');
    this.client = new MinioClient({
      endPoint: config.endPoint,
      port: config.port,
      useSSL: config.useSSL,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
    });
    void this.ensureBucket();
  }

  async upload(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    await this.client.putObject(this.bucket, key, buffer, buffer.length, {
      'Content-Type': mimeType,
    });
    this.logger.debug(`Uploaded ${key} to MinIO bucket ${this.bucket}`);
    return this.getUrl(key);
  }

  async delete(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }

  getUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  private async ensureBucket(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
      // Set public read policy so uploaded files are accessible without auth
      const policy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${this.bucket}/*`],
        }],
      });
      await this.client.setBucketPolicy(this.bucket, policy);
      this.logger.log(`Created MinIO bucket: ${this.bucket}`);
    }
  }
}
