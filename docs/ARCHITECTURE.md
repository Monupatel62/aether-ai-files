# Architecture — aether-ai-files

**Status:** Proposed; not implemented.

## Mission
Secure upload validation, metadata, storage abstraction, download authorization, and file lifecycle.

## Ownership
MIME/signature checks, size limits, malware-scanning hook, tenant-bound object keys, signed-download policy, retention/deletion.

## Dependencies
- Database: persistence interfaces and migration conventions; no private domain-table coupling.
- Security: policy and content-handling contracts.
- Observability: redacted operational telemetry.
Files does not depend on API. The API consumes Files' public lifecycle and authorization contract.

## Upload lifecycle
1. Receive a request through the owning API or another approved caller boundary; do not import API implementation.
2. Authenticate caller and resolve trusted tenant/resource scope from approved identity and authorization contracts.
3. Validate declared size and content type, then verify file signature rather than trusting extension or MIME header.
4. Store using tenant-bound opaque object keys and private-by-default access.
5. Run malware/content scanning through a bounded, isolated hook where required; quarantine uncertain results.
6. Persist metadata and lifecycle state through approved database contracts.
7. Authorize every download; issue short-lived scoped links only after authorization.
8. Propagate deletion/retention requests to object storage, derivatives, indexes and backups according to policy.

## Trust boundaries
Treat filenames, metadata, uploaded bytes and scanner output as untrusted. Never expose a public object URL by default. Avoid logging content or credentials. Every resource operation must enforce current authorization at the resource-owning boundary.

## Open decisions
Object-storage provider, scanning implementation, signed-link lifetime, size limits and retention periods require reviewed decisions.
