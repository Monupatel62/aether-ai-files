# Dependencies and Contracts — aether-ai-files

**Status:** Proposed; storage and scanner vendors remain unselected.

## Direct dependencies

Database persistence/migration contracts, security policy contracts, observability interfaces, and an object-storage adapter to be selected. The Product API is a consumer of the public file lifecycle contract, not a dependency imported by this repository.

## Owned capabilities

MIME/signature checks, size limits, malware-scanning hook, tenant-bound object keys, signed-download policy, retention/deletion.

## Required contracts

- Typed schemas, explicit versioning, stable error categories, limits, and compatibility policy.
- Tenant/user context and authorization rules for any scoped data/action.
- Correlation IDs, safe telemetry, and explicit failure/timeout/retry behavior.
- Retention/deletion semantics whenever data is persisted.
- Version upload/download metadata and lifecycle state.
- Define maximum file size, accepted content types, scan states and safe error categories.
- Bind object identifiers to tenant scope; do not accept arbitrary storage paths from callers.
- Specify authorization and expiry semantics for download links.
- Define idempotent deletion, retention, retry and reconciliation behavior across derivatives/indexes.
