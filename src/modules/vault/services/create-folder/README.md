# `create-folder` — Service

## Overview

- **Type**: GraphQL Mutation
- **GraphQL**: `createVaultFolder(input: CreateVaultFolderInput!): CreateFolderResult!`
- **Purpose**: Creates a user-defined folder at root or inside a parent folder.

## Input

| Field            | Type     | Required | Notes         |
| ---------------- | -------- | -------- | ------------- |
| `projectId`      | `ID`     | ✅       |               |
| `name`           | `String` | ✅       | Folder name   |
| `parentFolderId` | `ID`     | ❌       | `null` = root |

## Output

| Field    | Type          | Notes                |
| -------- | ------------- | -------------------- |
| `folder` | `VaultFolder` | Newly created folder |

## Flow Diagram

```
Client → createVaultFolder({ projectId, name, parentFolderId? })
    │
    ├─ [Auth] requireUser
    │
    ├─ Step 1: validateParent(parentFolderId, projectId)   [CONDITIONAL]
    │    → Only if parentFolderId is provided
    │    → VaultFolder WHERE id + projectId + isSystem=false + deletedAt=null
    │    → Throws 404 if parent not found in this project
    │    → Throws 403 if parent is a system folder
    │
    └─ Step 2: createFolderRecord(projectId, name, parentFolderId)
         → VaultFolder.create { projectId, name, parentFolderId, isSystem: false }
         → Returns newly created VaultFolder

    → { folder: VaultFolder }
```

## Failure Modes

| Trigger                 | Error            | Client Impact             |
| ----------------------- | ---------------- | ------------------------- |
| `userId` missing        | 401 Unauthorized | Redirect to login         |
| Parent folder not found | 404 Not Found    | Toast error               |
| Parent is system folder | 403 Forbidden    | Toast error               |
| DB error                | 500              | "Failed to create folder" |

## Performance Targets

- **p50**: < 30 ms (conditional 1 DB read + 1 DB write)
- **p99**: < 100 ms
