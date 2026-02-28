/**
 * Step 2 — Fetch Flat Pages
 *
 * Single DB query: all non-deleted pages for the project, ordered by position ASC.
 * Archived pages are included — the client decides whether to display them.
 * The in-memory tree builder (build-tree step) depends on position-sorted order
 * to ensure children[] arrays are pre-sorted without a secondary sort.
 */

import type { PrismaClient } from "@prisma/client";
import type { FlatPage } from "../types";

export async function fetchFlatPages(
  projectId: string,
  userId: string,
  db: PrismaClient
): Promise<FlatPage[]> {
  return db.page.findMany({
    where: {
      projectId,
      deletedAt: null,
      collaborators: { some: { userId } },
    },
    orderBy: { position: "asc" },
  });
}
