# `delete-file` — Service

## Overview

- **Type**: GraphQL Mutation
- **GraphQL**: `deleteVaultFile(input: DeleteVaultFileInput!): DeleteFileResult!`
- **Purpose**: Soft-deletes a file and releases its storage quota. S3 lifecycle rule expires the object after 30 days.

## Input

| Field    | Type | Required | Notes |
| -------- | ---- | -------- | ----- |
| `fileId` | `ID` | ✅       |       |

## Output

| Field     | Type      | Notes                    |
| --------- | --------- | ------------------------ |
| `success` | `Boolean` | Always `true` on success |
| `id`      | `ID`      | Deleted file ID          |

## Flow Diagram

```
Client → deleteVaultFile({ fileId })
    │
    ├─ [Auth] requireUser
    │
    ├─ Step 1: fetchActiveFileForEdit(fileId, userId)
    │    → VaultFile WHERE id + status=ACTIVE + deletedAt=null
    │    → Throws 404 if not found
    │    → Returns { id, projectId, workspaceId, sizeBytes }
    │
    ├─ [PARALLEL — Promise.all]
    │   ├─ Step 2: softDeleteFile(file.id)
    │   │    → VaultFile.update { deletedAt: now() }
    │   │    → S3 object stays; lifecycle rule expires it after 30 days
    │   │
    │   └─ Step 3: releaseUsage(projectId, workspaceId, sizeBytes)
    │        → UsageRecord PROJECT:   usedBytes -= sizeBytes, fileCount -= 1
    │        → UsageRecord WORKSPACE: usedBytes -= sizeBytes, fileCount -= 1
    │
    └─ → { success: true, id: fileId }
```

## Failure Modes

| Trigger                          | Error            | Client Impact                   |
| -------------------------------- | ---------------- | ------------------------------- |
| `userId` missing                 | 401 Unauthorized | Redirect to login               |
| File not found / already deleted | 404 Not Found    | Item already gone, UI refreshes |
| DB error on parallel step        | 500              | "Failed to delete file"         |

## Performance Targets

- **p50**: < 40 ms (1 DB read + 2 parallel DB writes)
- **p99**: < 150 ms

## Design Notes

See `vault-system-design.md` § 11.7 (soft-delete rationale).

Soft-delete is intentional — S3 storage is reclaimed by a lifecycle rule after 30 days, creating a grace period for future recovery features. Hard delete is not implemented.
