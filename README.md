# aether-ai-files

**Status:** Initial tenant-scoped file lifecycle core implemented on a feature branch. No production storage provider or malware scanner is configured.

## Implemented

- [File lifecycle source](src/index.js): safe filename validation, media-type allowlist, size limits, tenant-scoped authorization, SHA-256 integrity verification, injected storage/metadata adapters, and deletion-pending reporting.
- [Unit tests](test/files.test.js): upload/download, unsafe names/types/sizes, tenant isolation, authorization denial, content tampering, and failed storage deletion.
- Dependency-free Node.js package with Node 20/22 CI.

## Critical limitations

- Storage and metadata adapters must enforce their own tenant isolation and durable consistency.
- Upload compensation is best-effort; an orphan-cleanup job is still required.
- Deletion marks metadata inaccessible before object-store deletion; a cleanup/reconciliation worker must retry pending deletions.
- File type allowlisting is not malware scanning or content validation. Do not trust client-provided media types.
- No object-storage provider, encryption-at-rest policy, virus scanner, signed download URL, quota service, or production deployment is configured.

## Documentation

- [Repository specification](docs/REPOSITORY_SPECIFICATION.md)
- [Project specification](docs/PROJECT_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Dependencies and contracts](docs/DEPENDENCIES_AND_CONTRACTS.md)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Security review](docs/SECURITY_REVIEW.md)
- [Master catalog](https://github.com/Monupatel62/aether-ai-platform/blob/main/docs/REPOSITORY_CATALOG.md)
