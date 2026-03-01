# `request-upload` — Service

## Overview

- **Type**: GraphQL Mutation (Step 1 of 2-phase upload)
- **GraphQL**: `requestVaultUpload(input: RequestUploadInput!): RequestUploadResult!`
- **Purpose**: Validates the upload, enforces quota, creates a PENDING file row, and returns a presigned S3 PUT URL. The client PUTs bytes directly to S3 — they never touch our server.

## Input

| Field         | Type     | Required | Notes                       |
| ------------- | -------- | -------- | --------------------------- |
| `projectId`   | `ID`     | ✅       |                             |
| `workspaceId` | `ID`     | ✅       |                             |
| `folderId`    | `ID`     | ❌       | `null` = root               |
| `name`        | `String` | ✅       | Original filename           |
| `mimeType`    | `String` | ✅       | Validated against allowlist |
| `sizeBytes`   | `Float`  | ✅       | Max 50 MB                   |

## Output

| Field          | Type       | Notes                                   |
| -------------- | ---------- | --------------------------------------- |
| `fileId`       | `ID`       | PENDING VaultFile ID                    |
| `presignedUrl` | `String`   | S3 PUT URL — client uses this to upload |
| `expiresAt`    | `DateTime` | now + 15 min                            |

## Flow Diagram

```
Client → requestVaultUpload({ projectId, workspaceId, folderId?, name, mimeType, sizeBytes })
    │
    ├─ [Auth] requireUser
    │
    ├─ Step 1: validateUploadInput(input)                    [sync, no I/O]
    │    → MIME in VAULT_ALLOWED_MIME_TYPES
    │    → Extension not in VAULT_BLOCKED_EXTENSIONS
    │    → sizeBytes ≤ 50 MB
    │    → Throws 400 on violation
    │
    ├─ Step 2: checkQuota(projectId, workspaceId, sizeBytes) [async, DB]
    │    → [PARALLEL] fetch project + workspace UsageRecords
    │    → used + reserved + incoming ≤ project limit (5 GB)
    │    → used + reserved + incoming ≤ workspace limit (20 GB)
    │    → projectFileCount < 10 000
    │    → workspaceFileCount < 100 000
    │    → Atomically: reservedBytes += sizeBytes  ← prevents TOCTOU
    │    → Throws 403 if any limit exceeded
    │
    ├─ Step 3: createPendingFile({ ...input, uploaderUserId })
    │    → buildS3Key(workspaceId, projectId, VAULT, fileId, name)
    │    → VaultFile.create { status: PENDING, s3Key, sizeBytes, ... }
    │    → Returns { id, s3Key }
    │
    └─ Step 4: generatePutUrl(s3Key, sizeBytes, mimeType)
         → PutObjectCommand with ContentLength + ContentType + Tagging
         → getSignedUrl TTL: 900s (15 min)
         → Returns { url, expiresAt }

    → { fileId, presignedUrl, expiresAt }

    Client then:
      ② PUT bytes directly to S3 presigned URL
      ③ Call confirmVaultUpload(fileId) on success
```

## Failure Modes

| Trigger                  | Error           | Client Impact                           |
| ------------------------ | --------------- | --------------------------------------- |
| Invalid MIME type        | 400 Bad Request | "File type not allowed" toast           |
| File > 50 MB             | 400 Bad Request | "File too large" toast                  |
| Blocked extension        | 400 Bad Request | "File type not allowed" toast           |
| Project quota exceeded   | 403 Forbidden   | "Project storage limit reached" modal   |
| Workspace quota exceeded | 403 Forbidden   | "Workspace storage limit reached" modal |
| S3 presign fails         | 500             | "Upload failed — try again"             |

## Performance Targets

- **p50**: < 80 ms (parallel quota DB reads + one file create + one AWS SDK call)
- **p99**: < 300 ms

## Design Notes

See `vault-system-design.md` § 2 (Upload Flow) and § 5 (Quota Guard).

`reservedBytes` is incremented atomically **before** returning the presigned URL. This prevents the TOCTOU race where two concurrent uploads both pass the quota check simultaneously. See § 11.1.
