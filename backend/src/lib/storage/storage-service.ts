export type StorageObject = { data: Buffer; contentType: "image/png" | "image/jpeg" };

export interface StorageService {
  put(key: string, data: Buffer, contentType: StorageObject["contentType"]): Promise<void>;
  get(key: string): Promise<StorageObject | null>;
  delete(key: string): Promise<void>;
}
