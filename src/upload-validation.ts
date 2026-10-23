export type DetectedContentType = "image/png" | "image/jpeg" | "image/gif" | "image/webp" | "application/pdf";

export interface UploadValidationOptions {
  readonly maxBytes?: number;
  readonly allowedTypes?: Readonly<Partial<Record<DetectedContentType, readonly string[]>>>;
}

export interface ValidatedUpload {
  readonly fileName: string;
  readonly contentType: DetectedContentType;
  readonly sizeBytes: number;
}

const DEFAULT_ALLOWED_TYPES: Readonly<Record<DetectedContentType, readonly string[]>> = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"]
};

function matches(bytes: Uint8Array, signature: readonly number[]): boolean {
  return bytes.length >= signature.length && signature.every((byte, index) => bytes[index] === byte);
}

export function detectKnownContentType(bytes: Uint8Array): DetectedContentType | undefined {
  if (matches(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (matches(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (matches(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) || matches(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])) return "image/gif";
  if (matches(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
  if (bytes.length >= 12 &&
      matches(bytes.slice(0, 4), [0x52, 0x49, 0x46, 0x46]) &&
      matches(bytes.slice(8, 12), [0x57, 0x45, 0x42, 0x50])) return "image/webp";
  return undefined;
}

function validateFileName(fileName: string): { safeName: string; extension: string } {
  if (typeof fileName !== "string" || fileName.length < 1 || fileName.length > 180 ||
      fileName.includes("/") || fileName.includes("\\") || fileName.includes("..") ||
      /[\u0000-\u001f\u007f]/.test(fileName) || fileName.startsWith(".")) {
    throw new TypeError("Invalid upload filename.");
  }
  const safeName = fileName.trim().replace(/\s+/g, "_");
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,179}$/.test(safeName)) throw new TypeError("Invalid upload filename.");
  const dot = safeName.lastIndexOf(".");
  if (dot <= 0 || dot === safeName.length - 1) throw new TypeError("Upload filename must have a file extension.");
  return { safeName, extension: safeName.slice(dot).toLowerCase() };
}

/**
 * Validate a bounded byte buffer before it enters a storage pipeline.
 * Signature checks are not malware scanning, file parsing, authorization, or a safe-extraction sandbox.
 */
export function validateUploadBytes(
  fileName: string,
  declaredContentType: string,
  bytes: Uint8Array,
  options: UploadValidationOptions = {}
): ValidatedUpload {
  const maxBytes = options.maxBytes ?? 10 * 1024 * 1024;
  if (!Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > 50 * 1024 * 1024) {
    throw new RangeError("maxBytes must be an integer between 1 and 52428800.");
  }
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) throw new TypeError("Upload content must be a non-empty byte buffer.");
  if (bytes.byteLength > maxBytes) throw new RangeError("Upload exceeded the configured byte limit.");

  const { safeName, extension } = validateFileName(fileName);
  const detectedContentType = detectKnownContentType(bytes);
  if (!detectedContentType) throw new TypeError("Unsupported or unrecognized file signature.");
  const declared = declaredContentType.split(";")[0]?.trim().toLowerCase();
  if (declared !== detectedContentType) throw new TypeError("Declared content type does not match the file signature.");

  const allowed = options.allowedTypes ?? DEFAULT_ALLOWED_TYPES;
  const extensions = allowed[detectedContentType];
  if (!extensions || !extensions.map(item => item.toLowerCase()).includes(extension)) {
    throw new TypeError("File type is not allowed or filename extension does not match content.");
  }

  return Object.freeze({ fileName: safeName, contentType: detectedContentType, sizeBytes: bytes.byteLength });
}
