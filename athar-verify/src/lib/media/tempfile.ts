import { createWriteStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';

/**
 * Media analysis needs a seekable file on disk — ffmpeg cannot probe or sample
 * frames from a one-shot HTTP stream. These helpers materialise an object into
 * a private temp directory and guarantee cleanup.
 */

export async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), 'athar-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch((err) =>
      logger.warn('tempdir_cleanup_failed', { err }),
    );
  }
}

/** Streams a stored object into `dir` and returns the local path. */
export async function materializeObject(key: string, dir: string): Promise<string> {
  const target = path.join(dir, path.basename(key).replace(/[^a-zA-Z0-9._-]/g, '_') || 'media');
  const { stream } = await storage().getStream(key);
  await pipeline(stream, createWriteStream(target));
  return target;
}

/** Runs `fn` against a local copy of a stored object, then cleans up. */
export async function withStoredObject<T>(
  key: string,
  fn: (filePath: string) => Promise<T>,
): Promise<T> {
  return withTempDir(async (dir) => fn(await materializeObject(key, dir)));
}
