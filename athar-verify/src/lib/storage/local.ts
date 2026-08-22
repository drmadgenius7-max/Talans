import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, stat, unlink, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { env } from '@/lib/config/env';
import { AppError, notFound } from '@/lib/errors';
import type { ObjectInfo, PresignedUpload, PutObjectInput, StorageDriver } from './types';

/**
 * Filesystem-backed storage for local development and single-box deployments.
 *
 * There is no presigned-URL equivalent on a plain filesystem, so uploads are
 * routed through the application's own authenticated upload endpoint and reads
 * are streamed by `/api/media/...`.
 */
export class LocalStorageDriver implements StorageDriver {
  readonly name = 'local' as const;
  private readonly root: string;

  constructor(root = env().LOCAL_STORAGE_DIR) {
    this.root = path.resolve(process.cwd(), root);
  }

  /** Guards against `../` traversal in a key that reached us from user input. */
  private resolve(key: string): string {
    const clean = key.replace(/^\/+/, '');
    const full = path.resolve(this.root, clean);
    if (full !== this.root && !full.startsWith(this.root + path.sep)) {
      throw new AppError('مسار ملف غير صالح.', 400, 'INVALID_KEY');
    }
    return full;
  }

  async createPresignedUpload(input: { key: string; contentType: string }): Promise<PresignedUpload> {
    return {
      url: `/api/admin/uploads/direct?key=${encodeURIComponent(input.key)}`,
      headers: { 'content-type': input.contentType },
      method: 'PUT',
      key: input.key,
      expiresInSeconds: 900,
    };
  }

  async createSignedDownloadUrl(): Promise<string | null> {
    // Local files are always streamed through the authenticated media route.
    return null;
  }

  async put(input: PutObjectInput): Promise<ObjectInfo> {
    const full = this.resolve(input.key);
    await mkdir(path.dirname(full), { recursive: true });
    const body = Buffer.isBuffer(input.body) ? Readable.from(input.body) : input.body;
    await pipeline(body, createWriteStream(full));
    const s = await stat(full);
    return { key: input.key, size: s.size, contentType: input.contentType, lastModified: s.mtime };
  }

  async getStream(key: string, range?: { start: number; end?: number }) {
    const full = this.resolve(key);
    let s;
    try {
      s = await stat(full);
    } catch {
      throw notFound('الملف غير موجود في التخزين.');
    }
    const stream = createReadStream(full, range ? { start: range.start, end: range.end } : undefined);
    return { stream, size: s.size, contentType: guessContentType(key) };
  }

  async getBuffer(key: string): Promise<Buffer> {
    try {
      return await readFile(this.resolve(key));
    } catch {
      throw notFound('الملف غير موجود في التخزين.');
    }
  }

  async head(key: string): Promise<ObjectInfo | null> {
    try {
      const s = await stat(this.resolve(key));
      return { key, size: s.size, contentType: guessContentType(key), lastModified: s.mtime };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.resolve(key));
    } catch {
      /* already gone */
    }
  }

  async exists(key: string): Promise<boolean> {
    return (await this.head(key)) !== null;
  }
}

const CONTENT_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.m4v': 'video/x-m4v',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

export function guessContentType(key: string): string {
  return CONTENT_TYPES[path.extname(key).toLowerCase()] ?? 'application/octet-stream';
}
