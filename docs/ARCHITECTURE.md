# Architecture — aether-ai-files

**Status:** Proposed; not implemented.

## Mission
Secure upload validation, metadata, storage abstraction, download authorization, and file lifecycle.

## Ownership
MIME/signature checks, size limits, malware-scanning hook, tenant-bound object keys, signed-download policy, retention/deletion.

## Dependencies
API, database, security, observability.

## Upload lifecycle
1. Authenticate caller and resolve trusted tenant/resource scope.
2. Validate declared size and content type, then verify file signature rather than trusting extension or MIME header.
3. Store using tenant-bound opaque object keys and private-by-default access.
4. Run malware/content scanning through a bounded, isolated hook where required; quarantine uncertain results.
5. Persist metadata and lifecycle state through approved database contracts.
6. Authorize every download; issue short-lived scoped links only after authorization.
7. Propagate deletion/retention requests to object storage, derivatives, indexes and backups according to policy.

## Trust boundaries
Treat filenames, metadata, uploaded bytes and scanner output as untrusted. Never expose a public object URL by default. Avoid logging content or credentials.

## Open decisions
Object-storage provider, scanning implementation, signed-link lifetime, size limits and retention periods require reviewed decisions.
