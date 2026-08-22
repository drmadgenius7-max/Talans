import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'node:stream';
import { env } from '@/lib/config/env';
import { notFound, serverError } from '@/lib/errors';
import type {
  ObjectInfo,
  PresignedUpload,
  PutObjectInput,
  StorageDriver,
  StorageDriverName,
} from './types';

/**
 * S3-compatible driver.
 *
 * The same implementation serves AWS S3, Cloudflare R2, and Supabase Storage —
 * they differ only in endpoint, region, and whether path-style addressing is
 * required, all of which come from configuration.
 */
export class S3StorageDriver implements StorageDriver {
  readonly name: StorageDriverName;
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(name: StorageDriverName = 's3') {
    const e = env();
    this.name = name;
    this.bucket = e.S3_BUCKET!;
    this.client = new S3Client({
      region: e.S3_REGION,
      endpoint: e.S3_ENDPOINT,
      forcePathStyle: e.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: e.S3_ACCESS_KEY_ID!,
        secretAccessKey: e.S3_SECRET_ACCESS_KEY!,
      },
    });
  }

  async createPresignedUpload(input: {
    key: string;
    contentType: string;
    maxBytes?: number;
  }): Promise<PresignedUpload> {
    const expiresIn = env().S3_PRESIGN_EXPIRY_SECONDS;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.key,
      ContentType: input.contentType,
      // Signing the length pins the upload size so a presigned URL cannot be
      // reused to push an arbitrarily large object into the bucket.
      ...(input.maxBytes ? { ContentLength: input.maxBytes } : {}),
    });
    const url = await getSignedUrl(this.client, command, { expiresIn });
    return {
      url,
      headers: {
        'content-type': input.contentType,
        ...(input.maxBytes ? { 'content-length': String(input.maxBytes) } : {}),
      },
      method: 'PUT',
      key: input.key,
      expiresInSeconds: expiresIn,
    };
  }

  async createSignedDownloadUrl(
    key: string,
    expiresInSeconds = env().S3_PRESIGN_EXPIRY_SECONDS,
    filename?: string,
  ): Promise<string | null> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ...(filename
        ? {
            ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
          }
        : {}),
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async put(input: PutObjectInput): Promise<ObjectInfo> {
    // The SDK needs a known length for streaming bodies; buffer when absent.
    const body =
      Buffer.isBuffer(input.body) || input.contentLength != null
        ? input.body
        : await streamToBuffer(input.body as Readable);

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: body as never,
        ContentType: input.contentType,
        ContentLength: input.contentLength ?? (Buffer.isBuffer(body) ? body.length : undefined),
        CacheControl: input.cacheControl,
      }),
    );

    const info = await this.head(input.key);
    if (!info) throw serverError('تعذر تأكيد رفع الملف إلى التخزين.');
    return info;
  }

  async getStream(key: string, range?: { start: number; end?: number }) {
    const res = await this.client
      .send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Range: range ? `bytes=${range.start}-${range.end ?? ''}` : undefined,
        }),
      )
      .catch(() => null);

    if (!res || !res.Body) throw notFound('الملف غير موجود في التخزين.');

    return {
      stream: res.Body as Readable,
      size: Number(res.ContentLength ?? 0),
      contentType: res.ContentType ?? 'application/octet-stream',
    };
  }

  async getBuffer(key: string): Promise<Buffer> {
    const { stream } = await this.getStream(key);
    return streamToBuffer(stream);
  }

  async head(key: string): Promise<ObjectInfo | null> {
    try {
      const res = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return {
        key,
        size: Number(res.ContentLength ?? 0),
        contentType: res.ContentType ?? 'application/octet-stream',
        lastModified: res.LastModified,
        etag: res.ETag,
      };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async exists(key: string): Promise<boolean> {
    return (await this.head(key)) !== null;
  }
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}
