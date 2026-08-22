import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import type { Readable } from 'node:stream';

/**
 * SHA-256 — the digital fingerprint at the centre of the whole system.
 *
 * Always computed by streaming: documentation videos routinely exceed the
 * memory a request handler should ever hold.
 */
export async function sha256OfStream(stream: Readable): Promise<{ hash: string; bytes: number }> {
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const chunk of stream) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buf.length;
    hash.update(buf);
  }
  return { hash: hash.digest('hex'), bytes };
}

export async function sha256OfFile(filePath: string): Promise<{ hash: string; bytes: number }> {
  return sha256OfStream(createReadStream(filePath));
}

export function sha256OfBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Hashes a web `ReadableStream` while writing it through to a sink.
 *
 * Used on the customer-upload path so the file is fingerprinted and persisted
 * to a temp file in a single pass.
 */
export async function sha256OfWebStream(
  stream: ReadableStream<Uint8Array>,
  onChunk?: (chunk: Buffer) => Promise<void> | void,
  maxBytes?: number,
): Promise<{ hash: string; bytes: number; truncated: boolean }> {
  const hash = createHash('sha256');
  const reader = stream.getReader();
  let bytes = 0;
  let truncated = false;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const buf = Buffer.from(value);
      bytes += buf.length;
      if (maxBytes != null && bytes > maxBytes) {
        truncated = true;
        break;
      }
      hash.update(buf);
      if (onChunk) await onChunk(buf);
    }
  } finally {
    reader.releaseLock();
  }

  return { hash: hash.digest('hex'), bytes, truncated };
}

export function isValidSha256(value: string): boolean {
  return /^[a-f0-9]{64}$/i.test(value);
}
