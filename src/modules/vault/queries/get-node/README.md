# `get-node` — Query

## Overview

- **Type**: GraphQL Query
- **GraphQL**: `getVaultNode(id: ID!, type: VaultNodeType!): VaultNode!`
- **Purpose**: Returns full metadata for a single folder or file. Used for the detail / info side-panel. Not used for listing.

## Input

| Field  | Type            | Required | Notes             |
| ------ | --------------- | -------- | ----------------- |
| `id`   | `ID`            | ✅       | Folder or file ID |
| `type` | `VaultNodeType` | ✅       | `FOLDER \| FILE`  |

## Output

`VaultNode = VaultFolder | VaultFile` (union)

**Folder fields**: `id, projectId, parentFolderId, name, isSystem, childFolderCount, fileCount, createdAt, updatedAt`

**File fields**: `id, projectId, folderId, name, mimeType, sizeBytes, source, sourceId, status, uploader, confirmedAt, createdAt, updatedAt`

## Flow Diagram

```
Client → getVaultNode(id, type: FOLDER | FILE)
    │
    ├─ [Auth] requireUser
    │
    ├─ [Branch on type]
    │
    ├─ type = FOLDER:
    │   └─ Step 1: fetchFolderNode(id)
    │        → [PARALLEL]
    │            folder           = VaultFolder.findFirst(id, deletedAt=null)
    │            childFolderCount = VaultFolder.count(parentFolderId=id, deletedAt=null)
    │            fileCount        = VaultFile.count(folderId=id, status=ACTIVE, deletedAt=null)
    │        → Returns { ...folder, childFolderCount, fileCount }
    │
    └─ type = FILE:
        └─ Step 1: fetchFileNode(id)
             → VaultFile.findFirst(id, status=ACTIVE, deletedAt=null)
             → INCLUDE uploader { id, fullName, avatarUrl }
             → Returns full VaultFile
```

## Failure Modes

| Trigger                | Error                 | Client Impact       |
| ---------------------- | --------------------- | ------------------- |
| `userId` missing       | 401 Unauthorized      | Redirect to login   |
| ID not found / deleted | 404 Not Found         | Detail panel closes |
| Invalid `type`         | 400 Bad Request (Zod) | —                   |

## Performance Targets

- **p50 (FOLDER)**: < 30 ms (3 parallel queries)
- **p50 (FILE)**: < 20 ms (1 query + include)
- **p99**: < 100 ms

## Design Notes

See `vault-system-design.md` § 9.5 (getVaultNode implementation notes).

This is the **detail-panel query**, not the listing query. It is called lazily when the user selects an item — not on initial folder load.
