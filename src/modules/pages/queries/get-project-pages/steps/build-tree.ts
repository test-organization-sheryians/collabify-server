/**
 * Step 3 — Build Tree
 *
 * O(N) single-pass in-memory BFS tree builder. No DB calls, no async — pure sync.
 *
 * Algorithm:
 *   1. Build a Map<pageId, PageWithChildren> from the flat array
 *   2. For each page: push to parent.children if parentPageId exists, else to roots[]
 *   3. Orphans (parentPageId points to a non-existent or deleted page) fall to roots[]
 *
 * WHY NOT recursive SQL CTE:
 *   - Page trees are shallow (< 10 levels typical) and bounded per-project
 *   - Single Prisma query is simpler, avoids raw SQL, fully type-safe
 *   - CTE would require $queryRaw breaking Prisma type safety
 *
 * Position ordering: preserved from fetch-flat-pages (position ASC) — children[]
 * arrays are already in correct display order without a secondary sort.
 */

import type { FlatPage, PageWithChildren } from "../types";

export function buildTree(flat: FlatPage[]): PageWithChildren[] {
  const pageMap = new Map<string, PageWithChildren>(
    flat.map((p) => [p.id, { ...p, children: [] }])
  );

  const roots: PageWithChildren[] = [];

  for (const page of pageMap.values()) {
    if (page.parentPageId) {
      const parent = pageMap.get(page.parentPageId);
      if (parent) {
        parent.children.push(page);
      } else {
        // Orphan — parent was deleted or is outside this project. Treat as root.
        roots.push(page);
      }
    } else {
      roots.push(page);
    }
  }

  return roots;
}
