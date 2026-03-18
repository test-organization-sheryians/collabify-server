# rename-page — Service Handler

## Overview

Updates the `title` field of a page and broadcasts the change to all active subscribers so their sidebar and tab headers update in real-time.

**Access:** EDITOR role only

---

## Folder Structure

```
rename-page/
├── handler.ts   — 3-step orchestrator
├── schema.ts    — input validation (pageId, title: string min 1)
└── index.ts     — re-export
```

> **No `steps/`:** Three sequential DB operations with no branching logic. No Redis state beyond the broadcast. Step files would add no value here.

---

## Execution Flow

```
renamePage(pageId, title)
    │
    ├─ 1. Auth + DB fetch
    │    page.findUnique({ id: pageId, deletedAt: null })
    │    → NOT_FOUND if missing
    │    pageCollaborator.findUnique({ pageId, userId })
    │    → FORBIDDEN if not EDITOR
    │
    ├─ 2. DB update
    │    page.update({ title })
    │    → returns updated page record
    │
    └─ 3. Pub/Sub broadcast
         PUBLISH page:{pageId}:events
           { type: "page:renamed", data: { pageId, title, renamedBy } }
         → sidebar + tab header update on connected clients
```

---

## Design Notes

- **Title is NOT synced via Y.Doc:** Page title lives in the DB and is updated via this GraphQL mutation — it is not part of the Yjs CRDT state. This avoids conflicts between the `meta.title` Y.Map entry and the DB field.
- **No Y.Doc update:** The `meta` Y.Map's `title` field is kept in sync by the client after receiving the `page:renamed` event. The client calls `ydoc.getMap('meta').set('title', newTitle)` locally — this update propagates through the standard page-update WS flow.
- **Broadcast is best-effort:** A publish failure after DB update is logged, not re-thrown.

---

## Error Codes

| Condition                | Error          |
| ------------------------ | -------------- |
| Not authenticated        | `UNAUTHORIZED` |
| Page not found / deleted | `NOT_FOUND`    |
| Caller is not EDITOR     | `FORBIDDEN`    |
