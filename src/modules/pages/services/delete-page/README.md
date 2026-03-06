# delete-page — Service Handler

## Overview

Soft-deletes a page. The page is NOT removed from the database — `deletedAt` is set to prevent data loss and allow recovery. All handlers guard against `deletedAt: null` so soft-deleted pages are invisible immediately.

**Access:** EDITOR role only  
**Gate:** Page must have zero active subscribers (no one currently editing)

---

## Folder Structure

```
delete-page/
├── handler.ts   — 4-step orchestrator
├── schema.ts    — input validation (pageId)
└── index.ts     — re-export
```

> **No `steps/`:** Only 4 operations, every one is trivial. Splitting into step files adds no testability benefit for a handler this simple.

---

## Execution Flow

```
deletePage(pageId)
    │
    ├─ 1. Auth + DB fetch
    │    page.findUnique({ id: pageId, deletedAt: null })
    │    → NOT_FOUND if missing or already deleted
    │    pageCollaborator.findUnique({ pageId, userId })
    │    → FORBIDDEN if not EDITOR
    │
    ├─ 2. Active subscriber guard
    │    ZCARD page:{pageId}:subscribers
    │    → CONFLICT if > 0 (someone is currently editing)
    │
    ├─ 3. Soft delete
    │    page.update({ deletedAt: new Date() })
    │
    └─ 4. Pub/Sub broadcast (best-effort)
         PUBLISH page:{pageId}:events { type: "page:deleted", data: { pageId, deletedBy } }
         → connected clients redirect to project root
```

---

## Design Notes

- **Soft delete only:** Hard delete would lose stream history and snapshots. Recovery is performed by clearing `deletedAt` (no separate mutation yet).
- **Subscriber guard:** Prevents race condition where a user edits and another deletes simultaneously. The deleting user must wait for all editors to close the page first.
- **No Redis cleanup:** Stream, snapshot, and subscriber keys are NOT deleted here. They are cleaned up lazily: subscriber key TTL auto-expires (24h), stream is cleaned by the stream worker on next cycle.
- **Broadcast is best-effort:** A PUBLISH failure after the DB update is logged but not re-thrown — the page is already soft-deleted. Clients will see the deletion on next page refresh regardless.

---

## Error Codes

| Condition                        | Error          |
| -------------------------------- | -------------- |
| Not authenticated                | `UNAUTHORIZED` |
| Page not found / already deleted | `NOT_FOUND`    |
| Caller is not EDITOR             | `FORBIDDEN`    |
| Active subscribers present       | `CONFLICT`     |
