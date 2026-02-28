# get-page — Query Handler

## Overview

Fetches a single page's metadata by ID. Access requires the caller to be a direct page collaborator OR a member of the page's workspace (workspace-wide read access).

---

## Folder Structure

```
get-page/
├── handler.ts  — 2-step fetch + access check
├── index.ts    — input type + re-export
└── schema.ts   — zod schema (pageId)
```

> No `steps/` — 2 DB queries with a simple OR-access pattern. No Redis, no S3.

---

## Execution Flow

```
getPage(pageId)
    │
    ├─ 1. DB fetch + not-found guard
    │    page.findFirst({ id: pageId, deletedAt: null })
    │    → NOT_FOUND if missing or soft-deleted
    │
    ├─ 2. Access check (collaborator OR workspace member)
    │    pageCollaborator.findUnique({ pageId, userId })
    │    IF not collaborator:
    │      workspaceMember.findUnique({ workspaceId: page.workspaceId, userId })
    │      → FORBIDDEN if not a workspace member either
    │
    └─ 3. Return page
```

---

## Access Model

```
Can read?
  pageCollaborator record exists for (pageId, userId)  → YES
  workspaceMember record exists for (workspaceId, userId) → YES
  Neither                                              → FORBIDDEN
```

**Rationale:** Workspace members can browse all pages in their workspace (read-only). Only explicit collaborators can edit (EDITOR role check is in service mutations, not here).

---

## Return Shape

Returns the raw Prisma `page` record — no joins, no collaborator data. Use `getPageCollaborators` for team info and `getPageSnapshot` for content.

---

## Error Codes

| Condition                                 | Error          |
| ----------------------------------------- | -------------- |
| Not authenticated                         | `UNAUTHORIZED` |
| Page not found / deleted                  | `NOT_FOUND`    |
| No collaborator + no workspace membership | `FORBIDDEN`    |
