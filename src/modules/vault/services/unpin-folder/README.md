# `unpin-folder` — Service

## Overview

- **Type**: GraphQL Mutation
- **GraphQL**: `unpinVaultFolder(input: UnpinVaultFolderInput!): UnpinFolderResult!`
- **Purpose**: Removes a folder from the current user's sidebar pinned list. Idempotent — no error if not currently pinned.

## Input

| Field      | Type | Required | Notes |
| ---------- | ---- | -------- | ----- |
| `folderId` | `ID` | ✅       |       |

## Output

| Field     | Type      | Notes                    |
| --------- | --------- | ------------------------ |
| `success` | `Boolean` | Always `true` on success |
| `id`      | `ID`      | Unpinned folder ID       |

## Flow Diagram

```
Client → unpinVaultFolder({ folderId })
    │
    ├─ [Auth] requireUser
    │
    └─ Step 1: deletePin(userId, folderId)
         → VaultPinnedFolder.deleteMany WHERE userId + folderId
         → Idempotent: returns { count: 0 } if not pinned, no error
         → No folder existence check needed

    → { success: true, id: folderId }
    Sidebar cache (staleTime=Infinity) is invalidated client-side.
```

## Failure Modes

| Trigger           | Error                 | Client Impact            |
| ----------------- | --------------------- | ------------------------ |
| `userId` missing  | 401                   | Redirect to login        |
| Folder not pinned | No error (idempotent) | Sidebar already clean    |
| DB error          | 500                   | "Failed to unpin folder" |
