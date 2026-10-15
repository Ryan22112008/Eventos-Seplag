export type StorageContentType = "image/png" | "image/jpeg" | "application/pdf";
export type StorageObject = { data: Buffer; contentType: StorageContentType };

export interface StorageService {
  put(key: string, data: Buffer, contentType: StorageContentType): Promise<void>;
  get(key: string): Promise<StorageObject | null>;
  delete(key: string): Promise<void>;
}
