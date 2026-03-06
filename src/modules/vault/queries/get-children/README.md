# `get-children` — Query

## Overview

- **Type**: GraphQL Query
- **GraphQL**: `getVaultChildren(projectId, parentFolderId?, cursor?, limit?, sortBy?, sortDir?): VaultChildrenResult!`
- **Purpose**: Returns immediate children (folders + paginated files) of a vault folder. `parentFolderId = null` = Home/root.

## Input

| Field            | Type             | Required | Notes                                |
| ---------------- | ---------------- | -------- | ------------------------------------ |
| `projectId`      | `ID`             | ✅       | Project scope                        |
| `parentFolderId` | `ID`             | ❌       | `null` = root/Home                   |
| `cursor`         | `ID`             | ❌       | Cursor for file pagination           |
| `limit`          | `Int`            | ❌       | Default 50                           |
| `sortBy`         | `VaultSortField` | ❌       | `NAME \| CREATED_AT \| SIZE \| TYPE` |
| `sortDir`        | `SortDirection`  | ❌       | `ASC \| DESC`                        |

## Output

| Field            | Type            | Notes                                      |
| ---------------- | --------------- | ------------------------------------------ |
| `folders`        | `VaultFolder[]` | All child folders (not paginated)          |
| `files`          | `VaultFile[]`   | Cursor-paginated ACTIVE files              |
| `totalFileCount` | `Int`           | Full file count at this level (for badges) |
| `hasNextPage`    | `Boolean`       | Pagination indicator                       |
| `nextCursor`     | `ID \| null`    | Cursor for next page                       |

## Flow Diagram

```
Client → getVaultChildren(projectId, parentFolderId?, cursor?, limit?, sortBy?, sortDir?)
    │
    ├─ [Auth] requireUser
    │
    ├─ [PARALLEL — Promise.all]
    │   ├─ Step 1: fetchFolders(projectId, parentFolderId)
    │   │    → VaultFolder WHERE projectId + parentFolderId + deletedAt=null
    │   │    → ORDER BY isSystem ASC, name ASC  (system folders first)
    │   │
    │   ├─ Step 2: fetchFiles(projectId, parentFolderId, cursor, limit, sortBy, sortDir)
    │   │    → VaultFile WHERE projectId + folderId + status=ACTIVE + deletedAt=null
    │   │    → take: limit+1 (hasNextPage detection)
    │   │    → INCLUDE uploader { id, fullName, avatarUrl }
    │   │
    │   └─ Step 3: countFiles(projectId, parentFolderId)
    │        → VaultFile COUNT (total for badge — unaffected by cursor)
    │
    └─ → { folders[], files[], totalFileCount, hasNextPage, nextCursor }
```

## Failure Modes

| Trigger                    | Error                  | Client Impact       |
| -------------------------- | ---------------------- | ------------------- |
| `userId` missing from auth | 401 Unauthorized       | Redirect to login   |
| `projectId` not found      | Empty result (no 404)  | Empty folder view   |
| DB error                   | 500 (wrapped AppError) | Generic error toast |

## Performance Targets

- **p50**: < 30 ms (all three queries run in parallel, single DB round-trip)
- **p99**: < 150 ms
- **Index**: `vault_files(project_id, folder_id, status)` — covered by existing index

## Design Notes

See `vault-system-design.md` § 6.2 (Navigation Flow) and § 9.5 (Query Implementation Notes).

Folders are not paginated — a folder is expected to have < 100 subfolders in practice. Only files are cursor-paginated.
