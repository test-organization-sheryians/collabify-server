# createWorkspace — Service Handler

## Overview

**Type:** GraphQL Mutation
**Path:** `services/create-workspace`
**Mutation:** `createWorkspace(input: CreateWorkspaceInput!): Workspace!`

Creates a new workspace and seeds the requesting user as OWNER. Enforces quota and a Redis slug reservation before writing to the database.

## Input / Output

| Field  | Type   | Description                                       |
| ------ | ------ | ------------------------------------------------- |
| slug   | String | Desired workspace URL slug (must be pre-reserved) |
| name   | String | Display name for the workspace                    |
| userId | String | Authenticated user creating the workspace         |

**Returns:** `Workspace`

## Flow

```
1. enforceQuota          → CONFLICT if MAX_OWNED_WORKSPACES exceeded
2. verifySlugReservation → CONFLICT if reservation missing or stolen (Redis)
3. insertWorkspace       → $transaction: workspace.create + workspaceMember(OWNER)
                         → P2002 → CONFLICT (slug taken) + del lock
                         → P2003 → UNAUTHORIZED (bad user FK) + del lock
4. finalizeLock          → promote lock key → exists-cache (1hr TTL); swallow Redis errors
```

## Failure Modes

| Trigger                       | Error Code                            | Status |
| ----------------------------- | ------------------------------------- | ------ |
| Quota exceeded                | — (from QuotaService)                 | 409    |
| Reservation missing/stolen    | WORKSPACE_CREATION_RESERVATION_STOLEN | 409    |
| Slug unique violation (P2002) | WORKSPACE_CREATION_DB_CONFLICT        | 409    |
| Bad user FK (P2003)           | UNAUTHORIZED                          | 401    |
