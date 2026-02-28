# get-active-page-collaborators — Query Handler

## Overview

Returns the list of users currently connected to a page in real-time. Source of truth: Redis ZSET (`page:{id}:subscribers`). Used to render live presence indicators (avatars, colored cursors, "X people viewing" badge).

---

## Folder Structure

```
get-active-page-collaborators/
├── handler.ts  — 3-step: access check → Redis ZRANGE → DB batch lookup
├── index.ts    — input type + re-export
└── schema.ts   — zod schema (pageId)
```

---

## Execution Flow

```
getActivePageCollaborators(pageId)
    │
    ├─ 1. Access check
    │    pageCollaborator.findUnique({ pageId, userId })
    │    → FORBIDDEN if not a collaborator
    │
    ├─ 2. Redis presence read
    │    ZRANGE page:{pageId}:subscribers 0 -1
    │    → [userId1, userId2, ...]
    │    → return [] immediately if empty (no DB query needed)
    │
    └─ 3. Batch user lookup
         user.findMany({ where: { id: { in: activeIds } } })
         userMap = Map<userId, user>
         return activeIds
           .map(id => ({ userId: id, user: userMap.get(id), role: 'VIEWER', joinedAt: ... }))
           .filter(Boolean)              ← drop any userId with no DB record (stale ZSET entry)
```

---

## Design Notes

- **Redis ZSET as presence store:** `page:{id}:subscribers` is managed by:
  - `subscribe-page` WS handler: `ZADD` on join (score = join timestamp)
  - `unsubscribe-page` WS handler: `ZREM` on leave
  - TTL = 24h (auto-expires stale sessions from crashed clients)
- **Role is not stored in Redis:** The ZSET contains only userIds. Role is not included in this response (defaults to `'VIEWER'`). If role is needed for presence UI, call `getPageCollaborators` and join client-side.
- **Stale entries:** If a ZSET entry exists for a userId that has no DB record, it is silently dropped via `.filter(Boolean)`. This handles the edge case where a user is deleted while subscribed.
- **No DataLoader here:** This is a query handler (not a field resolver), so DataLoader is unavailable. A direct `user.findMany` is equivalent.

---

## vs. `get-page-collaborators`

|                | `getActivePageCollaborators` | `getPageCollaborators`       |
| -------------- | ---------------------------- | ---------------------------- |
| Source         | Redis ZSET                   | Postgres                     |
| Returns        | Currently online only        | All collaborators ever added |
| Role included? | No (defaults to VIEWER)      | Yes                          |
| Use case       | Presence indicators          | Share settings UI            |

---

## Error Codes

| Condition                    | Error          |
| ---------------------------- | -------------- |
| Not authenticated            | `UNAUTHORIZED` |
| Caller is not a collaborator | `FORBIDDEN`    |
