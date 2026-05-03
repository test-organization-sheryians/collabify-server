# remove-page-collaborator — Service Handler

## Overview

Removes a single collaborator from a page. The page creator cannot be removed — they are the permanent owner and their collaborator record must always exist.

**Access:** EDITOR role only  
**Guard:** Cannot remove the page creator (`page.createdBy`)

---

## Folder Structure

```
remove-page-collaborator/
├── handler.ts   — 3-step orchestrator
├── schema.ts    — input validation (pageId, userId: targetUserId)
└── index.ts     — re-export
```

---

## Execution Flow

```
removePageCollaborator(pageId, userId: targetUserId)
    │
    ├─ 1. Auth + EDITOR check
    │    page.findUnique({ id: pageId, deletedAt: null })
    │    → NOT_FOUND if missing
    │    pageCollaborator.findUnique({ pageId, userId: callerId })
    │    → FORBIDDEN if caller is not EDITOR
    │
    ├─ 2. Creator guard
    │    IF page.createdBy === targetUserId
    │    → CONFLICT "Cannot remove the page creator"
    │
    └─ 3. DB delete
         pageCollaborator.delete({ where: { pageId_userId: { pageId, userId: targetUserId } } })
         → returns { success: true }
```

---

## Design Notes

- **Self-remove:** An EDITOR can remove themselves from the page (lose their own access). If they do, they will immediately lose the EDITOR access needed to make further changes — this is by design (self-eviction).
- **No Redis cleanup:** If the removed user is currently subscribed (active on the page), they remain subscribed until their WebSocket session ends. The `subscribe-page` handler's auth check (`authCheck` step) will reject any future re-subscription attempt.
- **No notification broadcast:** No `page:collaborator-removed` event is published currently. The removed user discovers the change next time they try to open the page.
- **Prisma will throw if target not found:** `pageCollaborator.delete` throws `P2025` (record not found) if the target is not a collaborator. This is caught by the outer error handler and re-thrown as a generic `AppError`.

---

## Error Codes

| Condition                  | Error          |
| -------------------------- | -------------- |
| Not authenticated          | `UNAUTHORIZED` |
| Page not found / deleted   | `NOT_FOUND`    |
| Caller is not EDITOR       | `FORBIDDEN`    |
| Target is the page creator | `CONFLICT`     |
