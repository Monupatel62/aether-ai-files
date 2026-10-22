# Engineering Standard — aether-ai-files

- Treat file bytes, names, MIME declarations and metadata as untrusted.
- Enforce streaming size limits and verify content signatures.
- Use private, tenant-bound object keys; do not accept raw storage paths.
- Authorize every download; temporary links must be scoped and expire.
- Quarantine files pending required scanning; fail safely on scanner errors.
- Make deletion idempotent and reconcile metadata, objects, derivatives and indexes.
- Keep file contents, tokens and signed URLs out of logs.
- Test cross-tenant access, malformed files, size limits, scanning failures and deletion.

- [ ] Threat model and abuse cases documented.
- [ ] Least privilege and tenant isolation defined.
- [ ] Sensitive fields excluded or redacted in logs.
- [ ] Input size/type validation and rate/usage limits defined.
- [ ] Deletion, retention, export, and audit requirements defined where applicable.
