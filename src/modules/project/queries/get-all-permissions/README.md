# getAllPermissions — Query Handler

## Overview

| Property | Value |
|---|---|
| **Type** | GraphQL Query |
| **Path** | `server/src/modules/project/queries/get-all-permissions/` |
| **GQL Signature** | `allPermissions(workspaceId: ID!): [Permission!]!` |
| **Auth** | `assertWorkspaceMember(workspaceId)` |
| **Used by** | Roles settings page — `RolePermissionsPanel` permission picker |

---

## Input / Output

### Input

| Field | Type | Notes |
|---|---|---|
| `workspaceId` | `ID!` | Used to verify caller is a workspace member |

### Output

`Permission[]` — sorted by `resource ASC, action ASC`

| Field | Type | Notes |
|---|---|---|
| `id` | `ID!` | Permission CUID |
| `resource` | `String!` | e.g. `project`, `conversation`, `message` |
| `action` | `String!` | e.g. `create`, `read`, `delete` |
| `description` | `String` | Human-readable description |
| `module` | `String!` | Module origin (`project`, `chat`, `vault`, etc.) |

---

## Flow Diagram

```
allPermissions(workspaceId)
  │
  ├─ 1. assertWorkspaceMember(workspaceId)          [auth gate]
  │      → throws 403 if caller is not a member
  │
  └─ 2. fetchProjectPermissions(ctx.db)             [steps/fetch-project-permissions.ts]
         → Permission.findMany WHERE module NOT IN ['workspace']
              AND isDeprecated = false
         → ORDER BY resource ASC, action ASC
         → returns PermissionRow[]
```

---

## Why workspace permissions are excluded

The `Permission` table is a flat catalogue — there is no scope column. The `module` field distinguishes which feature area owns each permission.

Workspace-level permissions (`module = "workspace"`) — such as `workspace:delete`, `workspace.role:create` — are granted to workspace system roles (OWNER/ADMIN). They are never appropriate to assign to project-scoped roles (MANAGER/CONTRIBUTOR/VIEWER), because:

- Project roles are resolved at project scope, not workspace scope
- Even if assigned, the PermissionEngine evaluates them against workspace roles only
- Showing them in the project role picker misleads admins into thinking they have effect

Filtered modules: `["workspace"]`

---

## Failure Modes

| Trigger | Handling | Client Impact |
|---|---|---|
| Caller not authenticated | `AppError.unauthorized()` → 401 | Toast: "You must be signed in" |
| Caller not a workspace member | `assertWorkspaceMember` → 403 | Toast: "Not a member of this workspace" |
| DB unavailable | Prisma throws → 500 | Toast: "Something went wrong" |

---

## Performance Targets

| Path | Target |
|---|---|
| Happy path (cached) | < 5ms (TanStack Query, 10-min stale) |
| Happy path (DB) | < 30ms (simple indexed table scan) |

---

## Improvement Plan

- **Add Redis caching**: permission catalogue is static between seeds — could cache in Redis with a `permissions:catalogue` key invalidated on seed. Currently relies solely on TanStack Query client-side stale time.
