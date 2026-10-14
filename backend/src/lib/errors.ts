export type DomainErrorCode = "FORBIDDEN" | "NOT_FOUND" | "INVALID_STATE" | "INVALID_DATA" | "CONFLICT" | "STORAGE_UNAVAILABLE";

export class DomainError extends Error {
  constructor(readonly code: DomainErrorCode, message: string = code) {
    super(message);
    this.name = "DomainError";
  }
}

export function publicErrorCode(error: unknown): string {
  return error instanceof DomainError ? error.code.toLowerCase() : "unexpected";
}
