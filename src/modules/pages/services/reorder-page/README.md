# reorder-page — Service Handler

## Overview

Moves a page to a new position within the page tree — can change both `parentPageId` (reparent) and `position` (sibling order). A circular ancestry guard prevents a page from being moved under its own descendant.

**Access:** EDITOR role only  
**Storage:** Postgres only (position is structural metadata, not CRDT-synced)

---

## Folder Structure

```
reorder-page/
├── handler.ts   — 4-step orchestrator
├── schema.ts    — input validation (pageId, newParentId?, newPosition)
└── index.ts     — re-export
```

---

## Execution Flow

```
reorderPage(pageId, newParentId?, newPosition)
    │
    ├─ 1. Auth + DB fetch
    │    page.findUnique({ id: pageId, deletedAt: null })
    │    → NOT_FOUND if missing
    │    pageCollaborator.findUnique({ pageId, userId })
    │    → FORBIDDEN if not EDITOR
    │
    ├─ 2. Circular ancestry guard (only if newParentId provided)
    │    Walk up the ancestor chain via parentPageId:
    │    cursor = newParentId
    │    while cursor:
    │      IF cursor === pageId → CONFLICT "Cannot move under own descendant"
    │      cursor = page.findUnique({ id: cursor }).parentPageId
    │
    ├─ 3. DB update
    │    page.update({ parentPageId: newParentId, position: newPosition })
    │
    └─ 4. Pub/Sub broadcast
         PUBLISH page:{pageId}:events
           { type: "page:reordered", data: { pageId, newParentId, newPosition, movedBy } }
         → sidebar re-renders tree
```

---

## Circular Ancestry Guard — Details

```
Example (BLOCKED):
  Page A  (root)
  └─ Page B
     └─ Page C (trying to become parent of A)

  Walk from C: C → B → A === pageId → CONFLICT

Example (ALLOWED):
  Page A
  └─ Page B
  └─ Page D (moving B to be a sibling of A)

  Walk from A: A !== B → A has no parent → loop ends → OK
```

**Complexity:** O(depth) — at most one DB query per ancestor level. Page trees are shallow in practice (typically < 10 levels).

---

## Position Field

The `position` field is a float/integer used for relative ordering of siblings. The frontend is responsible for computing new position values based on the drag-and-drop target (e.g. fractional indexing or gap-based numbering). The server stores whatever value the client sends.

---

## Error Codes

| Condition                            | Error          |
| ------------------------------------ | -------------- |
| Not authenticated                    | `UNAUTHORIZED` |
| Page not found / deleted             | `NOT_FOUND`    |
| Caller is not EDITOR                 | `FORBIDDEN`    |
| Moving page under its own descendant | `CONFLICT`     |
