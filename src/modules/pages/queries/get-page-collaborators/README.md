# get-page-collaborators — Query Handler

## Overview

Returns the authoritative list of all collaborators on a page with their roles and user profile data. Source of truth: Postgres DB (not Redis). Used by the "Share" / collaborator settings UI.

---

## Folder Structure

```
get-page-collaborators/
├── handler.ts  — 2-step: access check → collaborator fetch
├── index.ts    — input type + re-export
└── schema.ts   — zod schema (pageId)
```

---

## Execution Flow

```
getPageCollaborators(pageId)
    │
    ├─ 1. Access check (must be a collaborator to see the list)
    │    pageCollaborator.findUnique({ pageId, userId })
    │    → FORBIDDEN if not a collaborator
    │
    └─ 2. Fetch all collaborators with user join
         pageCollaborator.findMany({
           where: { pageId },
           include: { user: { select: { id, email, fullName, avatarUrl } } },
           orderBy: { joinedAt: 'asc' }
         })
         → [{ ...collaborator, user }]
```

---

## Design Notes

- **DB only — no Redis:** `getPageCollaborators` returns the persistent collaborator list (all users ever added). For the live presence list (currently online), use `getActivePageCollaborators` which reads from Redis ZSET.
- **No pagination:** Page collaborator lists are expected to be small (< 100). If this grows, add cursor-based pagination.
- **Access gate:** Only existing collaborators can see the collaborator list. A workspace member without a `pageCollaborator` record cannot see who has access to the page.

---

## vs. `get-active-page-collaborators`

|          | `getPageCollaborators`       | `getActivePageCollaborators`        |
| -------- | ---------------------------- | ----------------------------------- |
| Source   | DB (Postgres)                | Redis ZSET                          |
| Returns  | All collaborators with roles | Currently online users only         |
| Use case | Share/settings UI            | Live presence indicators            |
| Stale?   | No                           | Yes (TTL-based, ~24h max staleness) |

---

## Error Codes

| Condition                    | Error          |
| ---------------------------- | -------------- |
| Not authenticated            | `UNAUTHORIZED` |
| Caller is not a collaborator | `FORBIDDEN`    |
