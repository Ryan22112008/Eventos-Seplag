import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LocalStorageService } from "@backend/lib/storage/local-storage-service";

describe("storage privado de certificados", () => {
  it("armazena somente um PDF válido sob chave privada e recupera o tipo correto", async () => {
    const root = await mkdtemp(join(tmpdir(), "eventos-certificate-test-"));
    const storage = new LocalStorageService(root);
    const key = "123e4567-e89b-42d3-a456-426614174000/certificados/123e4567-e89b-42d3-a456-426614174001/123e4567-e89b-42d3-a456-426614174002.pdf";
    try {
      await expect(storage.put(key, Buffer.from("not a pdf"), "application/pdf")).rejects.toThrow("not a PDF");
      const pdf = Buffer.from("%PDF-1.7\n%%EOF");
      await storage.put(key, pdf, "application/pdf");
      await expect(storage.get(key)).resolves.toEqual({ data: pdf, contentType: "application/pdf" });
      await storage.delete(key);
      await expect(storage.get(key)).resolves.toBeNull();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
