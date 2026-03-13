# get-dm-by-users

Finds an existing DM conversation between the authenticated user and another user, scoped to a workspace + project.

---

## Query

```graphql
getDmByUsers(workspaceId: ID!, projectId: ID!, otherUserId: ID!): DmConversation
```

Returns `null` when no DM exists — this is not an error. The client uses this to check before prompting the user to start a new DM.

---

## Execution Flow

```
1. assertAccess(ctx)
   └─ authGate + permissions non-null check → AppError 401

2. assertNotSelf(userId, otherUserId)
   └─ userId !== otherUserId            → AppError 400

3. fetchDm(input, userId, ctx)
   └─ DB findFirst (type:DM, both members, not deleted)
   └─ returns null if no DM exists (valid response)

4. buildResponse(dm)
   └─ pure mapping: DmRow → DmConversation GQL shape
```

---

## Auth Design

`getDmByUsers` requires **userId authentication only** (per `auth-api-inventory.md`).

No workspace/project member assertion is needed because:
- The DB query already filters `members.some({ userId })` — the caller can only find DMs they are a member of
- The original handler incorrectly used `assertProjectMember` — removed as `[WRONG_GATE]` bug

---

## Input

| Field | Type | Validation |
|-------|------|-----------|
| `workspaceId` | `ID!` | CUID |
| `projectId` | `ID!` | CUID |
| `otherUserId` | `ID!` | CUID |

---

## Failure Modes

| Trigger | Error | HTTP |
|---------|-------|------|
| Not authenticated (no authGate) | `UNAUTHORIZED` | 401 |
| Self-DM attempt | `BAD_REQUEST` | 400 |
| DB crash | raw Error (logged) | 500 |
| No DM exists | — | returns `null` |

---

## TODO / Improvement Plan

- **TODO**: Consider caching the DM lookup result in Redis keyed by `dm:{workspaceId}:{projectId}:{userId}:{otherUserId}` to avoid a DB hit on every "start conversation" check.
- **TODO**: The `projectId` scope may be incorrect for workspace-level DMs (DMs without a project context). Verify whether DMs always have a `projectId` in the schema.
