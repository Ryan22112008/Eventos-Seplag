import { extname } from "node:path";

export const MAX_SCIENTIFIC_WORK_BYTES = 10 * 1024 * 1024;

export function validateScientificPdf(input: { name: string; declaredType: string; data: Buffer; maxBytes?: number }): void {
  const maxBytes = input.maxBytes ?? MAX_SCIENTIFIC_WORK_BYTES;
  if (input.data.byteLength === 0 || input.data.byteLength > maxBytes) throw new Error("INVALID_WORK_FILE_SIZE");
  if (extname(input.name).toLowerCase() !== ".pdf") throw new Error("INVALID_WORK_FILE_EXTENSION");
  if (input.declaredType !== "application/pdf") throw new Error("INVALID_WORK_FILE_MIME");
  const headerWindow = input.data.subarray(0, Math.min(input.data.length, 1024)).toString("latin1");
  const footerWindow = input.data.subarray(Math.max(0, input.data.length - 2048)).toString("latin1");
  if (!/%PDF-\d\.\d/.test(headerWindow) || !/%%EOF\s*$/.test(footerWindow)) throw new Error("INVALID_WORK_FILE_SIGNATURE");
}
