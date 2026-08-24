/**
 * Storage Provider Abstraction — file uploads (receipts, avatars, group
 * images) go through this interface so a real object-storage backend
 * (S3-compatible, etc.) can replace local disk storage later without
 * touching call sites.
 */
export interface StoredFile {
  storageKey: string;
  url: string;
}

export interface StorageProvider {
  readonly name: string;
  save(input: { buffer: Buffer; originalName: string; mimeType: string }): Promise<StoredFile>;
  read(storageKey: string): Promise<Buffer>;
  delete(storageKey: string): Promise<void>;
}
