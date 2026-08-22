import type { Readable } from 'node:stream';

export type StorageDriverName = 's3' | 'r2' | 'supabase' | 'local';

export type PresignedUpload = {
  /** Where the browser should PUT the bytes. */
  url: string;
  /** Headers the browser must send with the PUT. */
  headers: Record<string, string>;
  /** HTTP method for the upload. */
  method: 'PUT' | 'POST';
  key: string;
  expiresInSeconds: number;
};

export type ObjectInfo = {
  key: string;
  size: number;
  contentType: string;
  lastModified?: Date;
  etag?: string;
};

export type PutObjectInput = {
  key: string;
  body: Buffer | Readable;
  contentType: string;
  contentLength?: number;
  /** Objects are private by default; nothing in this system is world-readable. */
  cacheControl?: string;
};

/**
 * The storage contract.
 *
 * Everything the application needs from object storage lives here so switching
 * between S3, Cloudflare R2, Supabase Storage, or the local disk is a
 * configuration change rather than a code change.
 */
export interface StorageDriver {
  readonly name: StorageDriverName;

  /** Direct-to-storage upload URL, so large videos never pass through the app server. */
  createPresignedUpload(input: {
    key: string;
    contentType: string;
    maxBytes?: number;
  }): Promise<PresignedUpload>;

  /** Short-lived read URL. Returns null for drivers that must stream through the app. */
  createSignedDownloadUrl(key: string, expiresInSeconds?: number, filename?: string): Promise<string | null>;

  put(input: PutObjectInput): Promise<ObjectInfo>;

  getStream(key: string, range?: { start: number; end?: number }): Promise<{
    stream: Readable;
    size: number;
    contentType: string;
  }>;

  getBuffer(key: string): Promise<Buffer>;

  head(key: string): Promise<ObjectInfo | null>;

  delete(key: string): Promise<void>;

  exists(key: string): Promise<boolean>;
}
