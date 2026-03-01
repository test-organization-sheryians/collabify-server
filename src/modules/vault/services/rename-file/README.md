# `rename-file` — Service

## Overview

- **Type**: GraphQL Mutation
- **GraphQL**: `renameVaultFile(input: RenameVaultFileInput!): RenameFileResult!`
- **Purpose**: Renames a file (DB metadata only). The S3 object key is **not** changed.

## Input

| Field    | Type     | Required | Notes        |
| -------- | -------- | -------- | ------------ |
| `fileId` | `ID`     | ✅       |              |
| `name`   | `String` | ✅       | New filename |

## Output

| Field  | Type        | Notes                        |
| ------ | ----------- | ---------------------------- |
| `file` | `VaultFile` | Updated file with new `name` |

## Flow Diagram

```
Client → renameVaultFile({ fileId, name })
    │
    ├─ [Auth] requireUser
    │
    ├─ Step 1: fetchActiveFileForEdit(fileId, userId)
    │    → VaultFile WHERE id + status=ACTIVE + deletedAt=null
    │    → Throws 404 / 403
    │    → Result used for auth guard only
    │
    └─ Step 2: updateFileName(fileId, name)
         → VaultFile.update { name }
         → Returns updated VaultFile

    → { file: VaultFile }

    ⚠️  S3 key is NOT renamed — the object stays at its original path.
        Presigned URLs (GET/PUT) continue to work unchanged.
```

## Failure Modes

| Trigger          | Error | Client Impact           |
| ---------------- | ----- | ----------------------- |
| `userId` missing | 401   | Redirect to login       |
| File not found   | 404   | Item already gone       |
| DB error         | 500   | "Failed to rename file" |
