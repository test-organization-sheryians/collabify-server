# `move-folder` — Service

## Overview

- **Type**: GraphQL Mutation
- **GraphQL**: `moveVaultFolder(input: MoveVaultFolderInput!): MoveFolderResult!`
- **Purpose**: Moves a folder to a new parent. `targetParentFolderId = null` moves to root. System folders cannot be moved. Circular moves (folder into its own descendant) are rejected.

## Input

| Field                  | Type | Required | Notes                 |
| ---------------------- | ---- | -------- | --------------------- |
| `folderId`             | `ID` | ✅       |                       |
| `targetParentFolderId` | `ID` | ❌       | `null` = move to root |

## Output

| Field    | Type          | Notes                                    |
| -------- | ------------- | ---------------------------------------- |
| `folder` | `VaultFolder` | Updated folder with new `parentFolderId` |

## Flow Diagram

```
Client → moveVaultFolder({ folderId, targetParentFolderId? })
    │
    ├─ [Auth] requireUser
    │
    ├─ Step 1: fetchFolder(folderId)
    │    → VaultFolder WHERE id + isSystem=false + deletedAt=null
    │    → Throws 404 if not found
    │    → Throws 403 if isSystem
    │
    ├─ Step 2: validateMoveTarget(folderId, targetParentFolderId)
    │    → Prevents moving folder into itself → 409
    │    → Prevents moving folder into its own descendant → 409
    │    → Verifies target exists and is not isSystem
    │
    └─ Step 3: updateFolderParent(folderId, targetParentFolderId)
         → VaultFolder.update { parentFolderId: targetParentFolderId }
         → Returns updated VaultFolder

    → { folder: VaultFolder }
```

## Failure Modes

| Trigger                     | Error        | Client Impact                      |
| --------------------------- | ------------ | ---------------------------------- |
| `userId` missing            | 401          | Redirect to login                  |
| Folder is system            | 403          | Toast error                        |
| Folder not found            | 404          | Item already gone                  |
| Move into itself/descendant | 409 Conflict | "Cannot move a folder into itself" |
| DB error                    | 500          | "Failed to move folder"            |
