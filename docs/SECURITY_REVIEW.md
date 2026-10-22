# Security Review — aether-ai-files

**Status:** Design checklist only; no security audit/certification claimed.

## Main risks
Malicious uploads, MIME/signature mismatch, path/key manipulation, cross-tenant object access, public-link leakage, malware-scanner bypass, oversized files and incomplete deletion.

## Required controls
- [ ] Threat model and abuse cases documented.
- [ ] Least privilege and tenant isolation defined.
- [ ] Sensitive fields excluded or redacted in logs.
- [ ] Input size/type validation and rate/usage limits defined.
- [ ] Deletion, retention, export, and audit requirements defined where applicable.
- Store privately by default and use opaque tenant-scoped object keys.
- Verify bytes/signatures; never trust filename or client MIME alone.
- Quarantine until required scanning completes; bound scanner resources.
- Authorize each download and scope/expire temporary links.
- Propagate deletion and retention to derivatives, indexes and backups.

## Verification
Unit tests, contract tests, authorization/tenant isolation tests, malformed-input tests, dependency failure tests, and a non-production integration smoke test are required before release. Tests use synthetic or sanitized data only.
- [ ] Oversized, malformed and signature-mismatch tests.
- [ ] Cross-tenant upload/download denial tests.
- [ ] Expired-link and deletion propagation tests.
- [ ] Scanner timeout/failure and quarantine tests.
