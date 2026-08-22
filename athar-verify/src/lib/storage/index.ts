import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { env } from '@/lib/config/env';
import { LocalStorageDriver } from './local';
import { S3StorageDriver } from './s3';
import type { StorageDriver } from './types';

export type * from './types';

const globalForStorage = globalThis as unknown as { atharStorage?: StorageDriver };

/** The configured storage driver (created once per process). */
export function storage(): StorageDriver {
  if (globalForStorage.atharStorage) return globalForStorage.atharStorage;

  const driver = env().STORAGE_DRIVER;
  const instance: StorageDriver =
    driver === 'local' ? new LocalStorageDriver() : new S3StorageDriver(driver);

  globalForStorage.atharStorage = instance;
  return instance;
}

/**
 * Deterministic-ish, non-guessable object keys.
 *
 * The order number is deliberately *not* part of the key: object keys can end
 * up in logs and CDN traces, and we do not want them to reveal which orders
 * exist.
 */
export function buildStorageKey(input: {
  scope: 'documentation' | 'thumbnails' | 'uploads' | 'frames';
  originalFilename: string;
}): string {
  const ext = path.extname(input.originalFilename).toLowerCase().slice(0, 10) || '';
  const safeExt = /^\.[a-z0-9]{1,9}$/.test(ext) ? ext : '';
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${input.scope}/${yyyy}/${mm}/${randomUUID()}${safeExt}`;
}

/** Sanitises a user-supplied filename before it is stored or echoed back. */
export function sanitizeFilename(name: string): string {
  return (
    name
      // Strip control characters, then path separators.
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .replace(/[/\\]/g, '_')
      .trim()
      .slice(0, 180) || 'file'
  );
}
