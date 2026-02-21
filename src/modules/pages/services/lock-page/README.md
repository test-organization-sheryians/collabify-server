# lock-page — Service Handler

## Overview

Acquires an exclusive editor lock on a page. A locked page can only be edited by the lock holder — all other editors receive `PAGE_LOCKED` errors from the `page-update` WS handler.

**Access:** EDITOR role only  
**Backend:** Redis `SET NX EX` (atomic, single-writer guarantee)

---

## Folder Structure

```
lock-page/
├── handler.ts   — 5-step orchestrator
├── schema.ts    — input validation (pageId)
└── index.ts     — re-export
```

---

## Execution Flow

```
lockPage(pageId)
    │
    ├─ 1. Auth + DB fetch
    │    page.findUnique({ id: pageId, deletedAt: null })
    │    → NOT_FOUND if missing
    │    pageCollaborator.findUnique({ pageId, userId })
    │    → FORBIDDEN if not EDITOR
    │
    ├─ 2. Redis SET NX — atomic lock acquisition
    │    SET page:{pageId}:lock userId EX 3600 NX
    │    → "OK"  = acquired
    │    → null  = lock already held
    │       GET page:{pageId}:lock → lockHolder
    │       IF lockHolder !== userId → CONFLICT "Another user holds the lock"
    │       IF lockHolder === userId → already own it → EXPIRE 3600 (re-extend TTL)
    │
    ├─ 3. DB update
    │    page.update({ isLocked: true, lockedBy: userId })
    │    (DB mirrors Redis lock state for persistence across Redis restarts)
    │
    ├─ 4. Pub/Sub broadcast
    │    PUBLISH page:{pageId}:events
    │      { type: "page:locked", data: { pageId, lockedBy } }
    │    → connected clients show lock badge + disable editor
    │
    └─ 5. Return { page: updated }
```

---

## Lock Architecture

```
Redis lock:  page:{pageId}:lock  = userId  EX 3600
DB mirror:   page.isLocked = true, page.lockedBy = userId

WHY BOTH:
- Redis is the enforcement point (checked by page-update WS handler — hot path)
- DB is the persistence layer (survives Redis restart/eviction)
- On server restart, DB state is used to re-warm Redis if needed

WHY SET NX (not a Lua script):
- Single key, single writer — SET NX is atomic by nature
- No cross-key atomicity needed (unlike stream append which needs ZADD + XADD)
```

---

## TTL & Idempotency

- **TTL = 3600s (1h):** Safety net for crashed clients. Lock auto-releases without an explicit `unlock-page` call.
- **Re-acquire (same user):** If the caller already holds the lock, `SET NX` returns null but `GET` confirms ownership → `EXPIRE` extends the TTL. Idempotent — safe to call multiple times.
- **Different user:** `CONFLICT` error returned. Client shows "Page locked by {name}" UI.

---

## Error Codes

| Condition                   | Error          |
| --------------------------- | -------------- |
| Not authenticated           | `UNAUTHORIZED` |
| Page not found / deleted    | `NOT_FOUND`    |
| Caller is not EDITOR        | `FORBIDDEN`    |
| Another user holds the lock | `CONFLICT`     |
