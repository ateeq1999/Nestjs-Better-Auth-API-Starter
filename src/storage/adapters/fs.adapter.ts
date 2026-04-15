import { Injectable, Logger } from '@nestjs/common';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import type { StorageService } from '../storage.interface';

/**
 * Local filesystem storage adapter (STORAGE_DRIVER=fs).
 *
 * Stores files under `./uploads/` relative to the process working directory.
 * Only suitable for single-node dev; files are NOT shared across instances.
 *
 * In production, switch to MinioAdapter or S3Adapter.
 */
@Injectable()
export class FsStorageAdapter implements StorageService {
  private readonly logger = new Logger(FsStorageAdapter.name);
  private readonly baseDir = join(process.cwd(), 'uploads');
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    // Serve /uploads as a static directory in main.ts if using this adapter
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async upload(buffer: Buffer, key: string, _mimeType: string): Promise<string> {
    const filePath = join(this.baseDir, key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
    this.logger.debug(`Saved ${key} to local filesystem`);
    return this.getUrl(key);
  }

  async delete(key: string): Promise<void> {
    const filePath = join(this.baseDir, key);
    try {
      await unlink(filePath);
    } catch {
      this.logger.warn(`Could not delete ${key} — file may not exist`);
    }
  }

  getUrl(key: string): string {
    return `${this.baseUrl}/uploads/${key}`;
  }
}
