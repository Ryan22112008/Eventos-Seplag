import { extname } from "node:path";

export const MAX_EVENT_IMAGE_BYTES = 5 * 1024 * 1024;
export type SupportedImage = { extension: "png" | "jpg"; contentType: "image/png" | "image/jpeg" };

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function detectAndValidateEventImage(input: {
  name: string;
  declaredType: string;
  data: Buffer;
  maxBytes?: number;
}): SupportedImage {
  const maxBytes = input.maxBytes ?? MAX_EVENT_IMAGE_BYTES;
  if (input.data.byteLength === 0 || input.data.byteLength > maxBytes) throw new Error("INVALID_IMAGE_SIZE");

  let detected: SupportedImage | null = null;
  if (input.data.byteLength >= PNG_SIGNATURE.length && input.data.subarray(0, 8).equals(PNG_SIGNATURE)) {
    detected = { extension: "png", contentType: "image/png" };
  } else if (input.data.byteLength >= 4
    && input.data[0] === 0xff && input.data[1] === 0xd8 && input.data[2] === 0xff
    && input.data[input.data.length - 2] === 0xff && input.data[input.data.length - 1] === 0xd9) {
    detected = { extension: "jpg", contentType: "image/jpeg" };
  }

  if (!detected) throw new Error("INVALID_IMAGE_FORMAT");
  const extension = extname(input.name).toLowerCase();
  const allowedExtension = detected.extension === "png" ? extension === ".png" : extension === ".jpg" || extension === ".jpeg";
  if (!allowedExtension) throw new Error("IMAGE_EXTENSION_MISMATCH");
  if (input.declaredType && input.declaredType !== detected.contentType) throw new Error("IMAGE_TYPE_MISMATCH");
  return detected;
}
