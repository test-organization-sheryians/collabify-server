/**
 * Step 2 — Guard Circular Ancestry
 *
 * Prevents moving a page under one of its own descendants (cycle detection).
 * A move of pageId → newParentId would create a cycle if newParentId is
 * already a descendant of pageId.
 *
 * Algorithm: Walk up the ancestor chain starting from newParentId. If we
 * encounter pageId before reaching a root, the move would create a cycle.
 *
 * Complexity: O(D) where D = depth of newParentId. Bounded by tree depth
 * (typically < 10 levels). No full project scan needed.
 *
 * No-op when newParentId is null (moving to root — no cycle possible).
 */

import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function guardCircularAncestry(
  pageId: string,
  newParentId: string | null | undefined,
  db: PrismaClient
): Promise<void> {
  if (!newParentId) return; // root move — no cycle possible

  let currentId: string | null = newParentId;

  while (currentId) {
    if (currentId === pageId) {
      throw AppError.conflict(
        "Cannot move a page under one of its own descendants"
      );
    }

    const parent: { parentPageId: string | null } | null =
      await db.page.findUnique({
        where: { id: currentId },
        select: { parentPageId: true },
      });

    currentId = parent?.parentPageId ?? null;
  }
}
