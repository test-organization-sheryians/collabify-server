# unarchive-page — Service Handler

## Overview

Restores a single archived page by clearing `isArchived`. A parent-archived guard ensures tree integrity — you cannot restore a child page while its parent is still archived (create an orphaned visible node).

**Access:** EDITOR role only  
**Constraint:** Parent page must NOT be archived

---

## Folder Structure

```
unarchive-page/
├── handler.ts   — 4-step orchestrator
├── schema.ts    — input validation (pageId)
└── index.ts     — re-export
```

---

## Execution Flow

```
unarchivePage(pageId)
    │
    ├─ 1. Auth + DB fetch
    │    page.findUnique({ id: pageId, deletedAt: null })
    │    → NOT_FOUND if missing or deleted
    │    pageCollaborator.findUnique({ pageId, userId })
    │    → FORBIDDEN if not EDITOR
    │
    ├─ 2. Parent-archived guard
    │    IF page.parentPageId:
    │      parent = page.findUnique({ id: parentPageId, select: { isArchived } })
    │      → CONFLICT if parent.isArchived === true
    │         "Unarchive the parent first"
    │
    ├─ 3. DB update
    │    page.update({ isArchived: false })
    │
    └─ 4. Pub/Sub broadcast
         PUBLISH page:{pageId}:events
           { type: "page:unarchived", data: { pageId, restoredBy } }
         → clients add page back to active tree
```

---

## Design Notes

- **Top-down restore only:** A page can only be unarchived if its parent is visible (not archived). The user must unarchive from the top of the tree downward. This matches behavior in Notion/Linear.
- **Root pages:** `parentPageId === null` → no guard check. Root pages can always be unarchived.
- **No cascade:** Only the target page's flag is cleared. Descendants remain archived and must be individually unarchived by the user.

---

## Error Codes

| Condition                | Error          |
| ------------------------ | -------------- |
| Not authenticated        | `UNAUTHORIZED` |
| Page not found / deleted | `NOT_FOUND`    |
| Caller is not EDITOR     | `FORBIDDEN`    |
| Parent is still archived | `CONFLICT`     |
