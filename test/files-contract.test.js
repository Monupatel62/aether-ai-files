import test from "node:test";
import assert from "node:assert/strict";
import { createUploadIntent, validateUploadObservation, createObjectKey, createFileLifecycleEvent, canIssueDownloadGrant, DEFAULT_MAX_UPLOAD_BYTES } from "../src/index.js";

const input = { tenantId: "tenant-a", ownerPrincipalId: "user-a", fileId: "file-1", filename: "../report.pdf", sizeBytes: 1024, declaredMimeType: "application/pdf", extension: "pdf" };

test("normalizes filename and validates upload intent bounds", () => {
  const intent = createUploadIntent(input);
  assert.equal(intent.filename.includes("/"), false);
  assert.equal(intent.filename.includes(".."), false);
  assert.throws(() => createUploadIntent({ ...input, sizeBytes: DEFAULT_MAX_UPLOAD_BYTES + 1 }), /sizeBytes/);
  assert.throws(() => createUploadIntent({ ...input, declaredMimeType: "not-a-mime" }), /MIME/);
});

test("accepts only matching server-observed size, allowlisted detected MIME, verified signature, and clean scan", () => {
  const intent = createUploadIntent(input);
  const options = { allowedMimeTypes: ["application/pdf"] };
  assert.deepEqual(validateUploadObservation(intent, { sizeBytes: 1024, detectedMimeType: "application/pdf", signatureVerified: true, malwareScanStatus: "clean" }, options), { accepted: true, reason: "validated" });
  assert.equal(validateUploadObservation(intent, { sizeBytes: 1024, detectedMimeType: "application/pdf", signatureVerified: false, malwareScanStatus: "clean" }, options).accepted, false);
  assert.equal(validateUploadObservation(intent, { sizeBytes: 1024, detectedMimeType: "application/pdf", signatureVerified: true, malwareScanStatus: "pending" }, options).reason, "scan-not-clean");
  assert.equal(validateUploadObservation(intent, { sizeBytes: 2048, detectedMimeType: "application/pdf", signatureVerified: true, malwareScanStatus: "clean" }, options).reason, "size-mismatch");
  assert.equal(validateUploadObservation(intent, { sizeBytes: 1024, detectedMimeType: "text/html", signatureVerified: true, malwareScanStatus: "clean" }, options).reason, "mime-not-allowed");
});

test("builds opaque tenant-bound storage keys without filenames", () => {
  const key = createObjectKey({ tenantId: "tenant-a", fileId: "file-1" });
  assert.equal(key, "tenants/tenant-a/files/file-1");
  assert.equal(key.includes("report.pdf"), false);
});

test("creates versioned payload-free lifecycle events", () => {
  const event = createFileLifecycleEvent({ eventId: "event-1", eventType: "files.deletion-requested", tenantId: "tenant-a", fileId: "file-1", fileVersion: "rev-2", content: "do not include" });
  assert.equal(event.eventType, "files.deletion-requested");
  assert.equal("content" in event, false);
  assert.throws(() => createFileLifecycleEvent({ ...event, eventType: "files.anything" }), /unsupported/);
});

test("download grants require authoritative authorization and short expiry", () => {
  const file = { tenantId: "tenant-a", state: "available" };
  const request = { tenantId: "tenant-a", principalId: "user-a", authorized: true, policyVersion: "policy-v1", expiresInSeconds: 60 };
  assert.equal(canIssueDownloadGrant(file, request), true);
  assert.equal(canIssueDownloadGrant(file, { ...request, authorized: false }), false);
  assert.equal(canIssueDownloadGrant(file, { ...request, expiresInSeconds: 600 }), false);
  assert.equal(canIssueDownloadGrant({ ...file, state: "scanning" }, request), false);
});
