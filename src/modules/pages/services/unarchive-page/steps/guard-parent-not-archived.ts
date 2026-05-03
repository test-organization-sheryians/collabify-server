/**
 * Step 2 — Guard Parent Not Archived
 *
 * Prevents unarchiving a page whose parent is still archived.
 * Restoring a child while its parent remains archived would create an
 * inconsistent tree — the child would be visible but its parent hidden.
 *
 * No-op when the page has no parent (root page — always safe to unarchive).
 */

import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function guardParentNotArchived(
  pageId: string,
  db: PrismaClient
): Promise<void> {
  const page = await db.page.findUnique({
    where: { id: pageId },
    select: { parentPageId: true },
  });

  if (!page?.parentPageId) return; // root page — no parent to check

  const parent = await db.page.findUnique({
    where: { id: page.parentPageId },
    select: { isArchived: true },
  });

  if (parent?.isArchived) {
    throw AppError.conflict(
      "Cannot unarchive a page whose parent is still archived. Unarchive the parent first."
    );
  }
}
