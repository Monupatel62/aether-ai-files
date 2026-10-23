import { describe, expect, it } from "vitest";
import { detectKnownContentType, validateUploadBytes } from "../src/index.js";

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

  it("supports explicit allowlists without allowing unknown signatures", () => {
    expect(() => validateUploadBytes("avatar.png", "image/png", png, { allowedTypes: { "image/jpeg": [".jpg"] } })).toThrow("not allowed");
  });
});
