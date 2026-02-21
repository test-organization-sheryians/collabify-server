# get-project-pages — Query Handler

## Overview

Returns the full nested page tree for a project. Uses a single flat DB query followed by an O(N) in-memory BFS tree builder — no recursive DB queries, no CTEs.

---

## Folder Structure

```
get-project-pages/
├── handler.ts  — 3-step: auth → flat fetch → tree build
├── index.ts    — input type + re-export
└── schema.ts   — zod schema (projectId)
```

> No `steps/` — the tree builder is self-contained and tested alongside the handler.

---

## Execution Flow

```
getProjectPages(projectId)
    │
    ├─ 1. Auth + workspace membership check
    │    project.findUnique({ id: projectId, select: { workspaceId } })
    │    → NOT_FOUND if project missing
    │    workspaceMember.findUnique({ workspaceId, userId })
    │    → FORBIDDEN if not a workspace member
    │
    ├─ 2. Flat DB fetch (single query)
    │    page.findMany({
    │      where: { projectId, deletedAt: null },
    │      orderBy: { position: 'asc' }        ← siblings pre-sorted
    │    })
    │    → flat []Page (archived pages included — client filters)
    │
    └─ 3. O(N) BFS tree builder
         pageMap = Map<pageId, PageWithChildren>
         for each page:
           IF parentPageId → push to parent.children
           ELSE → push to roots[]
         return roots
```

---

## Tree Builder Algorithm

```typescript
// O(N) single-pass — no nested queries, no recursion
const pageMap = new Map(flat.map((p) => [p.id, { ...p, children: [] }]));
const roots = [];
for (const page of pageMap.values()) {
  if (page.parentPageId) {
    pageMap.get(page.parentPageId)?.children.push(page);
  } else {
    roots.push(page);
  }
}
return roots;
```

**Why flat + in-memory (not recursive SQL CTE):**

- Page trees are shallow (< 10 levels typical) and bounded per-project
- Single Prisma query is simpler, avoids raw SQL, cache-friendly
- CTE would require `$queryRaw` breaking Prisma type safety

**Position ordering:** Siblings are pre-sorted by `position ASC` in the DB query. The tree builder preserves this order, so `children[]` arrays are already in correct display order.

---

## Return Shape

```typescript
type PageWithChildren = Page & { children: PageWithChildren[] };
// Recursive — client renders the full tree
```

Archived pages are included in the response. The frontend decides whether to show an "Archive" section or hide archived pages based on `page.isArchived`.

---

## Error Codes

| Condition                     | Error          |
| ----------------------------- | -------------- |
| Not authenticated             | `UNAUTHORIZED` |
| Project not found             | `NOT_FOUND`    |
| Caller not a workspace member | `FORBIDDEN`    |
