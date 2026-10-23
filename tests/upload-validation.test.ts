import { describe, expect, it } from "vitest";
import { detectKnownContentType, validateUploadBytes, type UploadValidationOptions } from "../src/index.js";

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

describe("upload byte validation", () => {
  it("detects known signatures and validates metadata", () => {
    expect(detectKnownContentType(png)).toBe("image/png");
    expect(validateUploadBytes("avatar.png", "image/png", png)).toEqual({
      fileName: "avatar.png", contentType: "image/png", sizeBytes: png.length
    });
  });

  it("rejects MIME spoofing and extension mismatch", () => {
    expect(() => validateUploadBytes("avatar.png", "application/pdf", png)).toThrow("does not match");
    expect(() => validateUploadBytes("avatar.pdf", "image/png", png)).toThrow("extension");
  });

  it("rejects traversal filenames, unknown signatures, and oversized buffers", () => {
    expect(() => validateUploadBytes("../secret.png", "image/png", png)).toThrow("filename");
    expect(() => validateUploadBytes("file.bin", "application/octet-stream", new Uint8Array([1, 2, 3]))).toThrow("signature");
    expect(() => validateUploadBytes("avatar.png", "image/png", png, { maxBytes: 4 })).toThrow("byte limit");
  });

  it("detects JPEG, GIF, WebP, and PDF signatures", () => {
    expect(detectKnownContentType(new Uint8Array([0xff, 0xd8, 0xff, 0x00]))).toBe("image/jpeg");
    expect(detectKnownContentType(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))).toBe("image/gif");
    expect(detectKnownContentType(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe("image/webp");
    expect(detectKnownContentType(new TextEncoder().encode("%PDF-1.7"))).toBe("application/pdf");
  });

  it("allows MIME parameters but compares the normalized media type", () => {
    expect(validateUploadBytes("avatar.png", "IMAGE/PNG; charset=binary", png).contentType).toBe("image/png");
  });

  it("rejects invalid MIME values and unsafe filename controls", () => {
    expect(() => validateUploadBytes("avatar.png", "", png)).toThrow();
    expect(() => validateUploadBytes("avatar\\u0000.png", "image/png", png)).toThrow("filename");
    expect(() => validateUploadBytes(".hidden.png", "image/png", png)).toThrow("filename");
  });

  it("supports explicit allowlists without allowing unknown signatures", () => {
    expect(() => validateUploadBytes("avatar.png", "image/png", png, { allowedTypes: { "image/jpeg": [".jpg"] } })).toThrow("not allowed");
  });

  it("rejects malformed runtime MIME and allowlist inputs", () => {
    expect(() => validateUploadBytes("avatar.png", null as unknown as string, png)).toThrow("content type is invalid");
    expect(() => validateUploadBytes("avatar.png", "image/png", png, { allowedTypes: [] as unknown as UploadValidationOptions["allowedTypes"] })).toThrow("allowlist");
    expect(() => validateUploadBytes("avatar.png", "image/png", png, { allowedTypes: { "image/png": ["../png"] } })).toThrow("valid filename extensions");
  });
});
