import test from "node:test";
import assert from "node:assert/strict";
import { createFileService, FileLifecycleError, validateFileName } from "../src/index.js";

function fixture(overrides = {}) {
  const objects = new Map();
  const records = new Map();
  const calls = [];
  const storage = {
    async put({ key, bytes }) { objects.set(key, new Uint8Array(bytes)); },
    async get({ key }) { return objects.has(key) ? new Uint8Array(objects.get(key)) : null; },
    async delete({ key }) { objects.delete(key); },
  };
  const metadata = {
    async create(record) { records.set(record.id, record); },
    async get({ id, tenantId }) { const record = records.get(id); return record?.tenantId === tenantId ? record : null; },
    async markDeleted({ id, tenantId, deletedAt }) { const record = records.get(id); if (!record || record.tenantId !== tenantId) throw new Error("not found"); records.set(id, { ...record, status: "deleted", deletedAt }); },
  };
  const service = createFileService({ authorize: async (ctx) => { calls.push(ctx); return true; }, storage, metadata, clock: () => 123, ...overrides });
  return { service, objects, records, calls };
}
const principal = { id: "user-1", tenantId: "tenant-a" };
const content = new TextEncoder().encode("safe sample");

test("uploads and downloads tenant-scoped content with integrity check", async () => {
  const { service, calls } = fixture();
  const file = await service.upload({ principal, fileName: "note.txt", mediaType: "text/plain", content });
  const result = await service.download({ principal, fileId: file.id });
  assert.equal(result.file.sha256.length, 64);
  assert.equal(new TextDecoder().decode(result.content), "safe sample");
  assert.equal(calls[0].action, "file:create");
  assert.equal(calls[1].action, "file:read");
});

test("rejects path-like names, unsupported types, oversized and empty content", async () => {
  assert.throws(() => validateFileName("../secret.txt"), FileLifecycleError);
  const { service } = fixture({ maxBytes: 3 });
  await assert.rejects(service.upload({ principal, fileName: "x.txt", mediaType: "text/plain", content }), (e) => e.code === "file_too_large");
  await assert.rejects(service.upload({ principal, fileName: "x.txt", mediaType: "text/html", content }), (e) => e.code === "unsupported_media_type");
  await assert.rejects(service.upload({ principal, fileName: "x.txt", mediaType: "text/plain", content: new Uint8Array() }), (e) => e.code === "invalid_content");
});

test("denies access when policy denies and hides cross-tenant files", async () => {
  const fixtureA = fixture();
  const file = await fixtureA.service.upload({ principal, fileName: "note.txt", mediaType: "text/plain", content });
  await assert.rejects(fixtureA.service.download({ principal: { id: "user-2", tenantId: "tenant-b" }, fileId: file.id }), (e) => e.code === "not_found");
  const denied = fixture({ authorize: async () => false }).service;
  await assert.rejects(denied.upload({ principal, fileName: "x.txt", mediaType: "text/plain", content }), (e) => e.code === "forbidden");
});

test("detects stored content corruption", async () => {
  const { service, objects } = fixture();
  const file = await service.upload({ principal, fileName: "note.txt", mediaType: "text/plain", content });
  objects.set(file.id, new TextEncoder().encode("tampered"));
  await assert.rejects(service.download({ principal, fileId: file.id }), (e) => e.code === "content_integrity_failure");
});

test("marks file inaccessible before storage deletion and reports pending cleanup", async () => {
  const { service, records } = fixture({ storage: { put: async () => {}, get: async () => null, delete: async () => { throw new Error("offline"); } } });
  const file = await service.upload({ principal, fileName: "note.txt", mediaType: "text/plain", content });
  await assert.rejects(service.delete({ principal, fileId: file.id }), (e) => e.code === "deletion_pending");
  assert.equal(records.get(file.id).status, "deleted");
});
