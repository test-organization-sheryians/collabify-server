# `get-vault-usage` — Query

## Overview

- **Type**: GraphQL Query
- **GraphQL**: `getVaultUsage(projectId: ID!): VaultUsage!`
- **Purpose**: Returns current storage usage for the project and its workspace. Polled every 60 seconds by the client; invalidated on upload/delete.

## Input

| Field       | Type | Required | Notes         |
| ----------- | ---- | -------- | ------------- |
| `projectId` | `ID` | ✅       | Project scope |

## Output

| Field                   | Type    | Notes                                      |
| ----------------------- | ------- | ------------------------------------------ |
| `projectUsedBytes`      | `Float` | Confirmed ACTIVE storage for this project  |
| `projectLimitBytes`     | `Float` | Hard limit (5 GB = 5,368,709,120)          |
| `workspaceUsedBytes`    | `Float` | Aggregate ACTIVE storage for the workspace |
| `workspaceLimitBytes`   | `Float` | Hard limit (20 GB)                         |
| `projectFileCount`      | `Int`   | ACTIVE file count in project               |
| `projectFileCountLimit` | `Int`   | Hard limit (10 000)                        |

## Flow Diagram

```
Client → getVaultUsage(projectId)
    │  (polled every 60s; invalidated after confirmVaultUpload / deleteVaultFile)
    │
    ├─ [Auth] requireUser
    │
    └─ Step 1: fetchUsage(projectId)
         → [PARALLEL]
             projectRecord   = VaultUsageRecord WHERE projectId + scope=PROJECT
             workspaceRecord = VaultUsageRecord WHERE workspaceId + scope=WORKSPACE
         → Returns computed VaultUsage object with limits applied

    → { projectUsedBytes, projectLimitBytes, workspaceUsedBytes,
        workspaceLimitBytes, projectFileCount, projectFileCountLimit }
```

## Failure Modes

| Trigger                       | Error                   | Client Impact                 |
| ----------------------------- | ----------------------- | ----------------------------- |
| `userId` missing              | 401 Unauthorized        | Redirect to login             |
| Usage records not yet created | Returns all-zero result | Storage bar shows 0 / limit   |
| DB error                      | 500 (wrapped AppError)  | Storage bar shows error state |

## Performance Targets

- **p50**: < 20 ms (two parallel keyed lookups)
- **p99**: < 80 ms

## Design Notes

See `vault-system-design.md` § 5 (Quota Guard) and § 13 (Redis Usage).

`usedBytes` = confirmed ACTIVE bytes. `reservedBytes` (in-flight PENDING uploads) is intentionally excluded from the UI total — only committed storage is shown to users.
