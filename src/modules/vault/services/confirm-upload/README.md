# `confirm-upload` — Service

## Overview

- **Type**: GraphQL Mutation (Step 2 of 2-phase upload)
- **GraphQL**: `confirmVaultUpload(fileId: ID!): ConfirmUploadResult!`
- **Purpose**: After the client successfully PUTs the file to S3, this mutation verifies the object exists with the correct size/MIME, marks the file ACTIVE, and updates usage records.

## Input

| Field    | Type | Required | Notes                                       |
| -------- | ---- | -------- | ------------------------------------------- |
| `fileId` | `ID` | ✅       | PENDING VaultFile from `requestVaultUpload` |

## Output

| Field  | Type        | Notes                          |
| ------ | ----------- | ------------------------------ |
| `file` | `VaultFile` | Activated file (status=ACTIVE) |

## Flow Diagram

```
Client → confirmVaultUpload({ fileId })
    │  (called immediately after S3 PUT returns 200)
    │
    ├─ [Auth] requireUser
    │
    ├─ Step 1: validatePendingFile(fileId, userId)
    │    → VaultFile.findFirst WHERE id + status=PENDING + deletedAt=null
    │    → Guard: uploaderUserId === userId  (throws 403 if mismatch)
    │    → Throws 404 if not found / already ACTIVE / TTL expired
    │    → Returns PENDING VaultFile row
    │
    ├─ Step 2: verifyS3Object(file)
    │    → S3.HeadObject(s3Key)
    │    → ContentLength must match file.sizeBytes  (size mismatch attack)
    │    → ContentType must match file.mimeType     (MIME bypass check)
    │    → Throws 422 on any mismatch
    │
    └─ Step 3: activateFile(file)
         → [PARALLEL]
             VaultFile.update { status: ACTIVE, confirmedAt: now() }
             UsageRecord PROJECT:   reservedBytes -= sizeBytes, usedBytes += sizeBytes
             UsageRecord WORKSPACE: reservedBytes -= sizeBytes, usedBytes += sizeBytes
         → Returns updated (now ACTIVE) VaultFile

    → { file: VaultFile }  ← file is now visible in the Vault UI
```

## Failure Modes

| Trigger                      | Error             | Client Impact                     |
| ---------------------------- | ----------------- | --------------------------------- |
| `userId` missing             | 401 Unauthorized  | Redirect to login                 |
| File not PENDING / not found | 404 Not Found     | "Upload slot expired — try again" |
| Uploader mismatch            | 403 Forbidden     | Security guard                    |
| S3 size mismatch             | 422 Unprocessable | Client discards upload            |
| S3 MIME mismatch             | 422 Unprocessable | Client discards upload            |
| DB error                     | 500               | "Confirmation failed — try again" |

## Performance Targets

- **p50**: < 100 ms (one DB read + one S3 HeadObject + parallel DB writes)
- **p99**: < 400 ms (S3 HeadObject latency dominates)

## Design Notes

See `vault-system-design.md` § 2 (step 4), § 11.3 (size mismatch attack), § 11.4 (MIME bypassing).

`verifyS3Object` is the key security step — it prevents a client from claiming they uploaded a large file when they didn't, or from bypassing the MIME allowlist by uploading a different content-type.
