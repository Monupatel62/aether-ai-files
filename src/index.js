import { createHash, randomUUID } from "node:crypto";

const SAFE_FILENAME = /^[^\\/\u0000-\u001f\u007f]{1,255}$/;
const DEFAULT_MEDIA_TYPES = new Set(["text/plain", "application/pdf", "application/json", "image/png", "image/jpeg", "image/webp"]);
export class FileLifecycleError extends Error {
  constructor(code, message = "File operation failed") { super(message); this.name = "FileLifecycleError"; this.code = code; }
}
function isRecord(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function validPrincipal(value) { return isRecord(value) && typeof value.id === "string" && value.id.length > 0 && typeof value.tenantId === "string" && value.tenantId.length > 0; }
function digest(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function bytesOf(value) { return value instanceof Uint8Array ? value : null; }

export function validateFileName(name) {
  if (typeof name !== "string" || !SAFE_FILENAME.test(name) || name === "." || name === ".." || name.trim() !== name) {
    throw new FileLifecycleError("invalid_filename", "File name is invalid");
  }
  return name;
}

export function createFileService({ authorize, storage, metadata, maxBytes = 10_485_760, mediaTypes = DEFAULT_MEDIA_TYPES, clock = () => Date.now() }) {
  if (typeof authorize !== "function") throw new TypeError("Authorization callback is required");
  if (!storage || typeof storage.put !== "function" || typeof storage.get !== "function" || typeof storage.delete !== "function") throw new TypeError("Storage adapter is incomplete");
  if (!metadata || typeof metadata.create !== "function" || typeof metadata.get !== "function" || typeof metadata.markDeleted !== "function") throw new TypeError("Metadata adapter is incomplete");
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 104_857_600) throw new TypeError("maxBytes is invalid");
  if (!(mediaTypes instanceof Set) || mediaTypes.size === 0 || [...mediaTypes].some((type) => typeof type !== "string")) throw new TypeError("mediaTypes must be a non-empty Set");
  if (typeof clock !== "function") throw new TypeError("clock must be a function");

  async function authorized(principal, action, file) {
    try { return (await authorize({ principal, action, resource: { type: "file", id: file?.id ?? null, tenantId: principal.tenantId, ownerId: file?.ownerId ?? principal.id } })) === true; }
    catch { return false; }
  }
  return Object.freeze({
    async upload({ principal, fileName, mediaType, content } = {}) {
      if (!validPrincipal(principal)) throw new FileLifecycleError("unauthenticated", "A trusted principal is required");
      validateFileName(fileName);
      if (typeof mediaType !== "string" || !mediaTypes.has(mediaType.toLowerCase())) throw new FileLifecycleError("unsupported_media_type", "File media type is not allowed");
      const bytes = bytesOf(content);
      if (!bytes || bytes.byteLength === 0) throw new FileLifecycleError("invalid_content", "File content must be a non-empty byte array");
      if (bytes.byteLength > maxBytes) throw new FileLifecycleError("file_too_large", "File exceeds the configured limit");
      if (!await authorized(principal, "file:create", null)) throw new FileLifecycleError("forbidden", "File creation is not authorized");

      const id = randomUUID();
      const record = Object.freeze({
        id, tenantId: principal.tenantId, ownerId: principal.id,
        fileName, mediaType: mediaType.toLowerCase(), sizeBytes: bytes.byteLength,
        sha256: digest(bytes), status: "active", createdAt: clock(),
      });
      try {
        await storage.put({ key: id, bytes: new Uint8Array(bytes), mediaType: record.mediaType });
        await metadata.create(record);
      } catch {
        try { await storage.delete({ key: id }); } catch { /* orphan cleanup is an operational responsibility */ }
        throw new FileLifecycleError("upload_failed", "File could not be stored");
      }
      return record;
    },

    async download({ principal, fileId } = {}) {
      if (!validPrincipal(principal)) throw new FileLifecycleError("unauthenticated", "A trusted principal is required");
      if (typeof fileId !== "string" || fileId.length > 128) throw new FileLifecycleError("invalid_file_id");
      let file;
      try { file = await metadata.get({ id: fileId, tenantId: principal.tenantId }); } catch { file = null; }
      if (!file || file.status !== "active" || file.tenantId !== principal.tenantId) throw new FileLifecycleError("not_found", "File was not found");
      if (!await authorized(principal, "file:read", file)) throw new FileLifecycleError("not_found", "File was not found");
      let content;
      try { content = bytesOf(await storage.get({ key: file.id })); } catch { content = null; }
      if (!content || digest(content) !== file.sha256) throw new FileLifecycleError("content_integrity_failure", "File content could not be verified");
      return Object.freeze({ file: Object.freeze({ id: file.id, fileName: file.fileName, mediaType: file.mediaType, sizeBytes: file.sizeBytes, sha256: file.sha256 }), content: new Uint8Array(content) });
    },

    async delete({ principal, fileId } = {}) {
      if (!validPrincipal(principal)) throw new FileLifecycleError("unauthenticated", "A trusted principal is required");
      if (typeof fileId !== "string" || fileId.length > 128) throw new FileLifecycleError("invalid_file_id");
      let file;
      try { file = await metadata.get({ id: fileId, tenantId: principal.tenantId }); } catch { file = null; }
      if (!file || file.status !== "active" || file.tenantId !== principal.tenantId) throw new FileLifecycleError("not_found", "File was not found");
      if (!await authorized(principal, "file:delete", file)) throw new FileLifecycleError("forbidden", "File deletion is not authorized");
      try { await metadata.markDeleted({ id: file.id, tenantId: file.tenantId, deletedAt: clock() }); }
      catch { throw new FileLifecycleError("delete_failed", "File deletion could not be recorded"); }
      try { await storage.delete({ key: file.id }); }
      catch { throw new FileLifecycleError("deletion_pending", "File is inaccessible but storage cleanup is pending"); }
      return Object.freeze({ id: file.id, status: "deleted" });
    },
  });
}
