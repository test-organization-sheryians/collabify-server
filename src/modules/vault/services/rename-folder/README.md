# `rename-folder` — Service

## Overview

- **Type**: GraphQL Mutation
- **GraphQL**: `renameVaultFolder(input: RenameVaultFolderInput!): RenameFolderResult!`
- **Purpose**: Renames a user folder. System folders (`isSystem=true`) cannot be renamed.

## Input

| Field      | Type     | Required | Notes           |
| ---------- | -------- | -------- | --------------- |
| `folderId` | `ID`     | ✅       |                 |
| `name`     | `String` | ✅       | New folder name |

## Output

| Field    | Type          | Notes                          |
| -------- | ------------- | ------------------------------ |
| `folder` | `VaultFolder` | Updated folder with new `name` |

## Flow Diagram

```
Client → renameVaultFolder({ folderId, name })
    │
    ├─ [Auth] requireUser
    │
    ├─ Step 1: fetchEditableFolder(folderId)
    │    → VaultFolder WHERE id + isSystem=false + deletedAt=null
    │    → Throws 404 if not found
    │    → Throws 403 if isSystem=true
    │
    └─ Step 2: updateFolderName(folderId, name)
         → VaultFolder.update { name }
         → Returns updated VaultFolder

    → { folder: VaultFolder }
```

## Failure Modes

| Trigger          | Error | Client Impact                      |
| ---------------- | ----- | ---------------------------------- |
| `userId` missing | 401   | Redirect to login                  |
| Folder not found | 404   | Item already gone                  |
| Folder is system | 403   | "System folders cannot be renamed" |
| DB error         | 500   | "Failed to rename folder"          |
