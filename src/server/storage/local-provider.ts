import "server-only";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";
import { generateSecureToken } from "@/lib/tokens";
import type { StorageProvider, StoredFile } from "./provider";

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export class LocalStorageProvider implements StorageProvider {
  readonly name = "local";
  private readonly baseDir = path.resolve(process.cwd(), env.storageLocalDir);

  async save(input: { buffer: Buffer; originalName: string; mimeType: string }): Promise<StoredFile> {
    await mkdir(this.baseDir, { recursive: true });
    const ext = EXT_BY_MIME[input.mimeType] ?? "bin";
    const storageKey = `${generateSecureToken(16)}.${ext}`;
    await writeFile(path.join(this.baseDir, storageKey), input.buffer);
    return { storageKey, url: `/api/files/${storageKey}` };
  }

  async read(storageKey: string): Promise<Buffer> {
    this.assertSafeKey(storageKey);
    return readFile(path.join(this.baseDir, storageKey));
  }

  async delete(storageKey: string): Promise<void> {
    this.assertSafeKey(storageKey);
    await unlink(path.join(this.baseDir, storageKey)).catch(() => {});
  }

  private assertSafeKey(storageKey: string) {
    if (storageKey.includes("..") || storageKey.includes("/") || storageKey.includes("\\")) {
      throw new Error("Invalid storage key");
    }
  }
}

export function getStorageProvider(): StorageProvider {
  return new LocalStorageProvider();
}
