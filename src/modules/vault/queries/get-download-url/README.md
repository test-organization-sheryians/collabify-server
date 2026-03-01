# `get-download-url` — Query

## Overview

- **Type**: GraphQL Query
- **GraphQL**: `getVaultDownloadUrl(fileId: ID!): VaultDownloadUrl!`
- **Purpose**: Returns a short-lived presigned S3 GET URL for downloading or previewing a file. TTL: 5 minutes.

## Input

| Field    | Type | Required | Notes            |
| -------- | ---- | -------- | ---------------- |
| `fileId` | `ID` | ✅       | File to download |

## Output

| Field       | Type       | Notes                              |
| ----------- | ---------- | ---------------------------------- |
| `url`       | `String`   | Presigned S3 GET URL               |
| `expiresAt` | `DateTime` | When the URL expires (now + 5 min) |

## Flow Diagram

```
Client → getVaultDownloadUrl(fileId)
    │
    ├─ [Auth] requireUser
    │
    ├─ Step 1: fetchActiveFile(fileId)
    │    → VaultFile WHERE id + status=ACTIVE + deletedAt=null
    │    → Throws 404 if not found or soft-deleted
    │    → Returns { s3Key }
    │
    └─ Step 2: generatePresignedGet(s3Key)
         → AWS SDK: GetObjectCommand + getSignedUrl
         → TTL: 300 seconds (VAULT_S3.PRESIGNED_GET_TTL_SECONDS)
         → Returns { url, expiresAt }

    → { url, expiresAt }

    ⚠️  Client must NEVER cache this URL — always request fresh ones.
         Stale URLs expose access after a user is removed from the project.
```

## Failure Modes

| Trigger                  | Error            | Client Impact                     |
| ------------------------ | ---------------- | --------------------------------- |
| `userId` missing         | 401 Unauthorized | Redirect to login                 |
| File not found / deleted | 404 Not Found    | "File no longer available"        |
| S3 signing error         | 500 (wrapped)    | "Failed to generate download URL" |

## Performance Targets

- **p50**: < 40 ms (one DB lookup + one AWS SDK call, no network I/O to S3)
- **p99**: < 200 ms

## Design Notes

See `vault-system-design.md` § 3 (Download / Preview Flow).

All vault files are private in S3 — no public bucket policy. Every download requires a fresh presigned URL. Short TTL limits the window for link leakage.
