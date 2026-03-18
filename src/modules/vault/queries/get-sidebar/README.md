# `get-sidebar` — Query

## Overview

- **Type**: GraphQL Query
- **GraphQL**: `getVaultSidebar(projectId: ID!): VaultSidebar!`
- **Purpose**: Returns sidebar data — user-pinned folders + project system folders. Fetched once on Vault mount; never re-fetched during navigation.

## Input

| Field       | Type | Required | Notes         |
| ----------- | ---- | -------- | ------------- |
| `projectId` | `ID` | ✅       | Project scope |

## Output

| Field           | Type            | Notes                                       |
| --------------- | --------------- | ------------------------------------------- |
| `pinnedFolders` | `VaultFolder[]` | User-scoped pins, ordered by `pinnedAt ASC` |
| `systemFolders` | `VaultFolder[]` | From Chat, Pages, Whiteboard, Tasks         |

## Flow Diagram

```
Client → getVaultSidebar(projectId)
    │  (called once on Vault mount — client caches staleTime=Infinity)
    │
    ├─ [Auth] requireUser
    │
    ├─ [PARALLEL — Promise.all]
    │   ├─ Step 1: fetchPinnedFolders(userId, projectId)
    │   │    → VaultPinnedFolder WHERE userId + projectId
    │   │    → INCLUDE folder
    │   │    → ORDER BY pinnedAt ASC
    │   │
    │   └─ Step 2: fetchSystemFolders(projectId)
    │        → VaultFolder WHERE projectId + isSystem=true + deletedAt=null
    │        → ORDER BY name ASC
    │
    └─ → { pinnedFolders[], systemFolders[] }
```

## Failure Modes

| Trigger                    | Error                   | Client Impact             |
| -------------------------- | ----------------------- | ------------------------- |
| `userId` missing           | 401 Unauthorized        | Redirect to login         |
| No pins/system folders yet | Empty arrays (no error) | Empty sidebar sections    |
| DB error                   | 500 (wrapped AppError)  | Sidebar shows error state |

## Performance Targets

- **p50**: < 20 ms (two parallel indexed queries)
- **p99**: < 80 ms
- **Cache**: Client caches with `staleTime: Infinity`; invalidated only on `pinVaultFolder` / `unpinVaultFolder`

## Design Notes

See `vault-system-design.md` § 6.1 (Navigation Model) and § 9.5.

Sidebar is decoupled from folder navigation — it never re-fetches when the user navigates between folders.
