# `move-file` — Service

## Overview

- **Type**: GraphQL Mutation
- **GraphQL**: `moveVaultFile(input: MoveVaultFileInput!): MoveFileResult!`
- **Purpose**: Moves a file to a different folder. `targetFolderId = null` moves to root. Files cannot be moved into system folders.

## Input

| Field            | Type | Required | Notes                 |
| ---------------- | ---- | -------- | --------------------- |
| `fileId`         | `ID` | ✅       |                       |
| `targetFolderId` | `ID` | ❌       | `null` = move to root |

## Output

| Field  | Type        | Notes                            |
| ------ | ----------- | -------------------------------- |
| `file` | `VaultFile` | Updated file with new `folderId` |

## Flow Diagram

```
Client → moveVaultFile({ fileId, targetFolderId? })
    │
    ├─ [Auth] requireUser
    │
    ├─ Step 1: fetchActiveFileForEdit(fileId, userId)
    │    → VaultFile WHERE id + status=ACTIVE + deletedAt=null
    │    → Throws 404 / 403
    │    → Returns { id, projectId, ... }
    │
    ├─ Step 2: validateTargetFolder(targetFolderId, file.projectId)
    │    → If targetFolderId provided:
    │        VaultFolder WHERE id + projectId + isSystem=false + deletedAt=null
    │    → Throws 404 if folder not in same project
    │    → Throws 403 if folder isSystem
    │
    └─ Step 3: updateFileFolder(fileId, targetFolderId)
         → VaultFile.update { folderId: targetFolderId }
         → Returns updated VaultFile

    → { file: VaultFile }
```

## Failure Modes

| Trigger                      | Error | Client Impact                           |
| ---------------------------- | ----- | --------------------------------------- |
| `userId` missing             | 401   | Redirect to login                       |
| File not found               | 404   | Item already gone                       |
| Target folder not in project | 404   | Toast error                             |
| Target is system folder      | 403   | "Cannot move files into system folders" |
| DB error                     | 500   | "Failed to move file"                   |
