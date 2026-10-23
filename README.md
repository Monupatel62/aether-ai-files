# @aether-ai/files

Upload byte-buffer validation utilities for Aether AI. This is not a complete file lifecycle or storage implementation.

## Current implementation

- Detects a limited set of known signatures: PNG, JPEG, GIF, WebP, and PDF.
- Enforces a configurable byte limit before accepting a buffer.
- Compares declared MIME type with detected signature.
- Checks file extension against the configured allowlist.
- Rejects traversal/control-character filenames and returns bounded metadata only.
- Includes tests and Node.js 22 CI with a high/critical dependency audit gate.

## Important limitations

Signature checks are not malware scanning, full format parsing, safe archive extraction, authorization, private storage, signed downloads, or deletion/retention enforcement. Supported file types are intentionally limited and must be expanded only with reviewed format-specific checks. The production storage backend, scanning service, signed-link expiry, and lifecycle/deletion semantics remain open decisions.

## Example

```ts
import { validateUploadBytes } from "@aether-ai/files";

const metadata = validateUploadBytes("avatar.png", "image/png", pngBytes, {
  maxBytes: 2 * 1024 * 1024
});
```

Always authorize access using authoritative metadata and current resource policy; possession of a filename or object key is never authorization.

## Development

```bash
npm install
npm audit --audit-level=high
npm run typecheck
npm test
npm run build
```
