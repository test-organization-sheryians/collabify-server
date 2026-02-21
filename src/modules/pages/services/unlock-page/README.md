# unlock-page — Service Handler

## Overview

Releases the exclusive editor lock. The lock owner can always unlock. Workspace ADMINs can also force-unlock (admin override path — currently enforcement commented out pending ADMIN role definition, see Design Notes).

**Access:** Lock owner OR workspace ADMIN

---

## Folder Structure

```
unlock-page/
├── handler.ts   — 4-step orchestrator
├── schema.ts    — input validation (pageId)
└── index.ts     — re-export
```

---

## Execution Flow

```
unlockPage(pageId)
    │
    ├─ 1. Auth + DB fetch
    │    page.findUnique({ id: pageId, deletedAt: null })
    │    → NOT_FOUND if missing
    │    IF page.lockedBy !== userId:
    │      workspaceMember.findUnique({ workspaceId, userId })
    │      → (ADMIN check — currently permissive, pending role enforcement)
    │
    ├─ 2. Redis DEL
    │    DEL page:{pageId}:lock
    │    (unconditional — no ownership check needed here since Step 1 guards access)
    │
    ├─ 3. DB update
    │    page.update({ isLocked: false, lockedBy: null })
    │
    └─ 4. Pub/Sub broadcast
         PUBLISH page:{pageId}:events
           { type: "page:unlocked", data: { pageId, unlockedBy } }
         → connected clients remove lock badge + re-enable editor
```

---

## Design Notes

- **DEL vs Lua ownership script:** Unlike `snapshot-lock` release which uses Lua (race condition safety), the page lock DEL here is safe because Step 1 already performs an ownership/ADMIN check in the application layer. The two steps are not atomic but the window is acceptable — only the lock owner or ADMIN can reach Step 2, and a concurrent lock re-acquisition between steps is prevented by the `page-update` WS handler's `GET` check which would return the new owner.
- **ADMIN enforcement commented out:** The branch that checks `member.role !== 'ADMIN'` is currently commented out. ADMIN force-unlock will be enforced once workspace roles are finalized. Until then, any workspace member can force-unlock — keep this in mind for public deployments.
- **Idempotency:** If the page is already unlocked (`lockedBy === null`), the DB update is a no-op and the broadcast fires redundantly. Safe.

---

## Error Codes

| Condition                | Error          |
| ------------------------ | -------------- |
| Not authenticated        | `UNAUTHORIZED` |
| Page not found / deleted | `NOT_FOUND`    |
