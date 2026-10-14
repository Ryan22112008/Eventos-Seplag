import type { StorageService, StorageObject } from "./storage-service";

export async function replaceStoredObjectReference(input: {
  storage: StorageService;
  newKey: string;
  data: Buffer;
  contentType: StorageObject["contentType"];
  oldKey: string | null;
  updateReference: (newKey: string) => Promise<boolean>;
  logCleanupFailure: (error: unknown) => void;
}): Promise<void> {
  await input.storage.put(input.newKey, input.data, input.contentType);
  try {
    if (!await input.updateReference(input.newKey)) throw new Error("REFERENCE_NOT_UPDATED");
  } catch (error) {
    await input.storage.delete(input.newKey).catch(input.logCleanupFailure);
    throw error;
  }
  if (input.oldKey) await input.storage.delete(input.oldKey).catch(input.logCleanupFailure);
}
