/**
 * Injection token for the storage service.
 * Use this when injecting the StorageService by token.
 */
export const STORAGE_SERVICE = 'STORAGE_SERVICE';

/**
 * Swappable file storage interface.
 *
 * Selected adapter is determined by STORAGE_DRIVER env var:
 *   fs      — local filesystem (default, dev/single-node)
 *   minio   — self-hosted S3-compatible (requires Docker: quay.io/minio/aistor/minio)
 *   s3      — AWS S3
 *   r2      — Cloudflare R2 (S3-compatible, same adapter as s3)
 *
 * All adapters return a public URL suitable for storing in the database.
 */
export interface StorageService {
  /**
   * Upload a file buffer and return the public URL.
   * @param buffer   File contents
   * @param key      Storage path / object key, e.g. "avatars/user123/photo.jpg"
   * @param mimeType MIME type of the file
   */
  upload(buffer: Buffer, key: string, mimeType: string): Promise<string>;

  /**
   * Delete a file by its storage key.
   */
  delete(key: string): Promise<void>;

  /**
   * Return the public URL for a given storage key (without uploading).
   */
  getUrl(key: string): string;
}
