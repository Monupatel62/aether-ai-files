export const FILES_CONTRACT_VERSION = "1.0";
export const DEFAULT_MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const MAX_FILENAME_LENGTH = 180;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const EXTENSION_RE = /^[A-Za-z0-9]{1,12}$/;
const STATES = new Set(["pending", "scanning", "available", "rejected", "deleting", "deleted"]);

function id(value, field) {
  if (typeof value !== "string" || !ID_RE.test(value)) throw new TypeError(`${field} must be a valid identifier`);
  return value;
}
function cleanFilename(value) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError("filename must be a non-empty string");
  const normalized = value.normalize("NFKC").replace(/[\\/\\0-\\x1f\\x7f]/g, "_").replace(/^\.+/, "").trim();
  if (!normalized || normalized === "." || normalized === "..") throw new TypeError("filename is invalid");
  if (normalized.length > MAX_FILENAME_LENGTH) throw new RangeError(`filename exceeds ${MAX_FILENAME_LENGTH} characters`);
  return normalized;
}
function safeMime(value) {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9!#$&^_.+-]{0,80}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,80}$/i.test(value)) {
    throw new TypeError("declaredMimeType must be a valid MIME type");
  }
  return value.toLowerCase();
}

export function createUploadIntent(input = {}, { maxBytes = DEFAULT_MAX_UPLOAD_BYTES } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("upload input must be an object");
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new RangeError("maxBytes must be a positive safe integer");
  const sizeBytes = input.sizeBytes;
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > maxBytes) throw new RangeError(`sizeBytes must be an integer from 1 to ${maxBytes}`);
  const declaredMimeType = safeMime(input.declaredMimeType);
  const extension = input.extension;
  if (extension !== undefined && (typeof extension !== "string" || !EXTENSION_RE.test(extension))) throw new TypeError("extension is invalid");
  return Object.freeze({
    contractVersion: FILES_CONTRACT_VERSION,
    tenantId: id(input.tenantId, "tenantId"),
    ownerPrincipalId: id(input.ownerPrincipalId, "ownerPrincipalId"),
    fileId: id(input.fileId, "fileId"),
    filename: cleanFilename(input.filename),
    sizeBytes,
    declaredMimeType,
    ...(extension ? { extension: extension.toLowerCase() } : {}),
    state: "pending",
    createdAt: input.createdAt ?? new Date().toISOString(),
  });
}

/** Validate server-observed facts against the intent; client MIME alone is never trusted. */
export function validateUploadObservation(intent, observation, { allowedMimeTypes = [], maxBytes = DEFAULT_MAX_UPLOAD_BYTES } = {}) {
  if (!intent || !observation) throw new TypeError("intent and observation are required");
  if (!Number.isSafeInteger(observation.sizeBytes) || observation.sizeBytes < 1 || observation.sizeBytes > maxBytes) {
    return Object.freeze({ accepted: false, reason: "size-limit" });
  }
  if (observation.sizeBytes !== intent.sizeBytes) return Object.freeze({ accepted: false, reason: "size-mismatch" });
  if (typeof observation.detectedMimeType !== "string" || !allowedMimeTypes.includes(observation.detectedMimeType.toLowerCase())) {
    return Object.freeze({ accepted: false, reason: "mime-not-allowed" });
  }
  if (observation.signatureVerified !== true) return Object.freeze({ accepted: false, reason: "signature-unverified" });
  if (observation.malwareScanStatus !== "clean") return Object.freeze({ accepted: false, reason: "scan-not-clean" });
  return Object.freeze({ accepted: true, reason: "validated" });
}

/** Generate a tenant-bound opaque key; never use the supplied filename as a storage path. */
export function createObjectKey({ tenantId, fileId }) {
  return `tenants/${encodeURIComponent(id(tenantId, "tenantId"))}/files/${encodeURIComponent(id(fileId, "fileId"))}`;
}

export function createFileLifecycleEvent(input = {}) {
  const eventType = input.eventType;
  const allowed = new Set([
    "files.uploaded",
    "files.scan-started",
    "files.scan-passed",
    "files.scan-rejected",
    "files.access-revoked",
    "files.deletion-requested",
    "files.deleted",
  ]);
  if (!allowed.has(eventType)) throw new TypeError("unsupported file lifecycle event type");
  return Object.freeze({
    contractVersion: FILES_CONTRACT_VERSION,
    eventId: id(input.eventId, "eventId"),
    eventType,
    tenantId: id(input.tenantId, "tenantId"),
    fileId: id(input.fileId, "fileId"),
    fileVersion: id(input.fileVersion, "fileVersion"),
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    ...(typeof input.correlationId === "string" && ID_RE.test(input.correlationId) ? { correlationId: input.correlationId } : {}),
  });
}

export function canIssueDownloadGrant(file, request) {
  if (!file || !request) return false;
  if (file.state !== "available" || file.tenantId !== request.tenantId) return false;
  if (request.authorized !== true || request.policyVersion == null || request.principalId == null) return false;
  if (typeof request.expiresInSeconds !== "number" || !Number.isInteger(request.expiresInSeconds) || request.expiresInSeconds < 1 || request.expiresInSeconds > 300) return false;
  return true;
}
