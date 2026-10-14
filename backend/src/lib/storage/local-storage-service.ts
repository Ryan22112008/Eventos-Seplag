import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import type { StorageObject, StorageService } from "./storage-service";
import { resolvePrivateStorageKey } from "./storage-key";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export class LocalStorageService implements StorageService {
  private readonly root: string;

  constructor(rootDirectory = process.env.PRIVATE_STORAGE_DIR || resolve(tmpdir(), "eventos-seplag-private")) {
    this.root = resolve(rootDirectory);
  }

  async put(key: string, data: Buffer, contentType: StorageObject["contentType"]): Promise<void> {
    const target = this.resolveKey(key);
    if (data.byteLength > MAX_IMAGE_BYTES) throw new Error("Storage object exceeds the configured limit.");
    const extensionType = key.endsWith(".png") ? "image/png" : "image/jpeg";
    if (extensionType !== contentType) throw new Error("Storage content type does not match the object key.");
    await mkdir(dirname(target), { recursive: true, mode: 0o700 });
    await writeFile(target, data, { flag: "wx", mode: 0o600 });
  }

  async get(key: string): Promise<StorageObject | null> {
    const target = this.resolveKey(key);
    try {
      const data = await readFile(target);
      return { data, contentType: key.endsWith(".png") ? "image/png" : "image/jpeg" };
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolveKey(key), { force: true });
  }

  private resolveKey(key: string): string {
    return resolvePrivateStorageKey(this.root, key);
  }
}

export function getStorageService(): StorageService {
  return new LocalStorageService();
}
