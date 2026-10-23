# Dependencies and Contracts — aether-ai-files

**Status:** Proposed; storage and scanner vendors remain unselected.

## Dependency boundary

- Consume public database/persistence contracts only; do not import domain-service internals or depend on private database implementation details.
- Consume the shared security policy contract and low-level observability interfaces.
- Use an object-storage adapter selected through an explicit composition boundary; the vendor and adapter remain TBD.
- The API is a caller of Files public lifecycle/download contracts, not a dependency that Files imports for authorization decisions.

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
