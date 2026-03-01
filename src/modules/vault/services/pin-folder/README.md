# `pin-folder` — Service

## Overview

- **Type**: GraphQL Mutation
- **GraphQL**: `pinVaultFolder(input: PinVaultFolderInput!): PinFolderResult!`
- **Purpose**: Pins a folder to the current user's sidebar. Idempotent — safe to call if already pinned. Both user folders and system folders can be pinned.

## Input

| Field       | Type | Required | Notes |
| ----------- | ---- | -------- | ----- |
| `folderId`  | `ID` | ✅       |       |
| `projectId` | `ID` | ✅       |       |

## Output

| Field    | Type          | Notes             |
| -------- | ------------- | ----------------- |
| `folder` | `VaultFolder` | The pinned folder |

## Flow Diagram

```
Client → pinVaultFolder({ folderId, projectId })
    │
    ├─ [Auth] requireUser
    │
    ├─ Step 1: fetchFolderForPin(folderId, projectId)
    │    → VaultFolder WHERE id + projectId + deletedAt=null
    │    → Throws 404 if folder not found in this project
    │    → Any folder (user or system) can be pinned
    │
    └─ Step 2: upsertPin(userId, projectId, folderId)
         → VaultPinnedFolder.upsert on unique(userId, folderId)
         → Idempotent: update pinnedAt if already exists
         → Returns void (folder returned from Step 1)

    → { folder: VaultFolder }
    Sidebar cache (staleTime=Infinity) is invalidated client-side.
```

## Failure Modes

| Trigger               | Error | Client Impact          |
| --------------------- | ----- | ---------------------- |
| `userId` missing      | 401   | Redirect to login      |
| Folder not in project | 404   | Toast error            |
| DB error              | 500   | "Failed to pin folder" |
