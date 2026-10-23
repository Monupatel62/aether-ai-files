# Dependencies and Contracts — aether-ai-files

**Status:** Proposed; storage and scanner vendors remain unselected.

## Direct dependencies

- `aether-ai-database`: persistence tooling and migration conventions; Files owns file lifecycle semantics.
- `aether-ai-security`: upload/download authorization and scanning policy.
- `aether-ai-observability`: redacted lifecycle telemetry.
- A selected object-storage adapter and malware-scanning integration, only after an explicit architecture decision.

## Consumers and non-dependencies

`aether-ai-api` is a consumer of the public Files lifecycle and download-authorization contract; Files MUST NOT depend on or import the API. RAG and Knowledge may consume versioned file lifecycle/metadata contracts but must not access private Files tables.

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
