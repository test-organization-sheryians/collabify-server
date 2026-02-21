# archive-page — Service Handler

## Overview

Archives a single page by setting `isArchived = true`. Archived pages are hidden from the default page tree but their content and history are preserved.

**Access:** EDITOR role only  
**Scope:** Archives the target page only (not descendants — see Design Notes)

---

## Folder Structure

```
archive-page/
├── handler.ts   — 3-step orchestrator
├── schema.ts    — input validation (pageId)
└── index.ts     — re-export
```

---

## Execution Flow

```
archivePage(pageId)
    │
    ├─ 1. Auth + DB fetch
    │    page.findUnique({ id: pageId, deletedAt: null })
    │    → NOT_FOUND if missing or deleted
    │    pageCollaborator.findUnique({ pageId, userId })
    │    → FORBIDDEN if not EDITOR
    │
    ├─ 2. DB update
    │    page.update({ isArchived: true })
    │
    └─ 3. Pub/Sub broadcast
         PUBLISH page:{pageId}:events
           { type: "page:archived", data: { pageId, archivedBy } }
         → clients remove page from active tree, show in archive section
```

---

## Design Notes

- **Single-page scope:** Only the target page's `isArchived` flag is set. Descendants are **not** recursively archived in this mutation — the frontend handles hiding them because they cannot be reached via the sidebar tree once the parent is archived. A future background job can enforce consistency.
- **`unarchive-page` constraint:** When unarchiving, the parent must NOT be archived (see `unarchive-page` README). This asymmetry enforces top-down archival integrity without needing cascading archive operations.
- **Active subscribers:** No subscriber guard needed for archive (unlike delete). Archived pages can still be read — `page-update` WS handler allows writes to archived pages (read-only enforcement is an application-level concern, not enforced server-side for archive state).

---

## Error Codes

| Condition                | Error          |
| ------------------------ | -------------- |
| Not authenticated        | `UNAUTHORIZED` |
| Page not found / deleted | `NOT_FOUND`    |
| Caller is not EDITOR     | `FORBIDDEN`    |
