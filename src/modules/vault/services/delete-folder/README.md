# `delete-folder` — Service

## Overview

- **Type**: GraphQL Mutation
- **GraphQL**: `deleteVaultFolder(input: DeleteVaultFolderInput!): DeleteFolderResult!`
- **Purpose**: Soft-deletes a folder. With `cascade=true`, recursively soft-deletes all descendant folders and files. System folders cannot be deleted.

## Input

| Field      | Type      | Required | Notes           |
| ---------- | --------- | -------- | --------------- |
| `folderId` | `ID`      | ✅       |                 |
| `cascade`  | `Boolean` | ❌       | Default `false` |

## Output

| Field     | Type      | Notes                    |
| --------- | --------- | ------------------------ |
| `success` | `Boolean` | Always `true` on success |
| `id`      | `ID`      | Deleted folder ID        |

## Flow Diagram

```
Client → deleteVaultFolder({ folderId, cascade?: boolean })
    │
    ├─ [Auth] requireUser
    │
    ├─ Step 1: fetchFolder(folderId)
    │    → VaultFolder WHERE id + deletedAt=null
    │    → Throws 404 if not found
    │    → Throws 403 if isSystem=true
    │
    ├─ Step 2: checkFolderEmpty(folderId)             [cascade=false only]
    │    → COUNT active files + child folders
    │    → Throws 409 Conflict if any active children exist
    │
    └─ Step 3: softDeleteRecursive(folderId)
         → BFS: collect all descendant folder IDs
         → Soft-delete all descendant VaultFiles (deletedAt = now)
         → Soft-delete all descendant VaultFolders (deletedAt = now)
         → Soft-delete the root folder itself

    → { success: true, id: folderId }
```

## Failure Modes

| Trigger                      | Error            | Client Impact                      |
| ---------------------------- | ---------------- | ---------------------------------- |
| `userId` missing             | 401 Unauthorized | Redirect to login                  |
| Folder not found             | 404 Not Found    | Item already gone                  |
| Folder is system             | 403 Forbidden    | "System folders cannot be deleted" |
| Has children + cascade=false | 409 Conflict     | "Folder is not empty" prompt       |
| DB error                     | 500              | "Failed to delete folder"          |

## Performance Targets

- **p50 (empty folder)**: < 30 ms
- **p50 (cascade, shallow)**: < 100 ms
- **p99 (cascade, deep)**: < 500 ms (depends on depth + child count)

## ⚠️ Tech Debt — UsageRecord not updated on cascade delete

`softDeleteRecursive` does **not** update `UsageRecord.usedBytes` when cascade-deleting files. Usage records are reconciled by the background cleanup job.

**Impact**: Storage bar may show stale (higher) usage after a cascade delete until the cleanup job runs.

**Fix**: `softDeleteRecursive` should sum `sizeBytes` of all deleted files and issue a batch `releaseUsage` call. Tracked as future work.

See `vault-system-design.md` § 11.5.
