import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { STORAGE_SERVICE } from './storage.interface';
import { FsStorageAdapter } from './adapters/fs.adapter';
import { MinioStorageAdapter } from './adapters/minio.adapter';
import { S3StorageAdapter } from './adapters/s3.adapter';

/**
 * Selects the storage adapter based on STORAGE_DRIVER env var.
 *
 *   STORAGE_DRIVER=fs      → FsStorageAdapter     (default; no extra config)
 *   STORAGE_DRIVER=minio   → MinioStorageAdapter  (requires MINIO_* vars)
 *   STORAGE_DRIVER=s3      → S3StorageAdapter     (requires AWS_* vars)
 *   STORAGE_DRIVER=r2      → S3StorageAdapter     (requires R2_* vars + endpoint)
 *
 * Inject the service using the token:
 *   constructor(@Inject(STORAGE_SERVICE) private readonly storage: StorageService) {}
 */
@Module({
  providers: [
    {
      provide: STORAGE_SERVICE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const driver = config.get<string>('STORAGE_DRIVER') ?? 'fs';

        switch (driver) {
          case 'minio':
            return new MinioStorageAdapter({
              endPoint: config.get<string>('MINIO_ENDPOINT') ?? 'localhost',
              port: config.get<number>('MINIO_PORT') ?? 9000,
              useSSL: config.get<string>('MINIO_USE_SSL') === 'true',
              accessKey: config.get<string>('MINIO_ACCESS_KEY') ?? 'minioadmin',
              secretKey: config.get<string>('MINIO_SECRET_KEY') ?? 'minioadmin',
              bucket: config.get<string>('MINIO_BUCKET') ?? 'uploads',
              publicUrl: config.get<string>('MINIO_PUBLIC_URL') ?? 'http://localhost:9000/uploads',
            });

          case 's3':
            return new S3StorageAdapter({
              region: config.getOrThrow<string>('AWS_REGION'),
              bucket: config.getOrThrow<string>('AWS_BUCKET'),
              accessKeyId: config.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
              secretAccessKey: config.getOrThrow<string>('AWS_SECRET_ACCESS_KEY'),
              publicUrl: config.getOrThrow<string>('AWS_PUBLIC_URL'),
            });

          case 'r2':
            return new S3StorageAdapter({
              region: 'auto',
              bucket: config.getOrThrow<string>('R2_BUCKET'),
              accessKeyId: config.getOrThrow<string>('R2_ACCESS_KEY_ID'),
              secretAccessKey: config.getOrThrow<string>('R2_SECRET_ACCESS_KEY'),
              endpoint: `https://${config.getOrThrow<string>('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
              publicUrl: config.getOrThrow<string>('R2_PUBLIC_URL'),
            });

          default: // 'fs'
            return new FsStorageAdapter(
              config.get<string>('BETTER_AUTH_URL') ?? 'http://localhost:3000',
            );
        }
      },
    },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule { }
