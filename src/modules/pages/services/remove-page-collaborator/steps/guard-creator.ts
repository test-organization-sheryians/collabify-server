/**
 * Step 2 — Guard Creator
 *
 * Prevents removing the page creator from the collaborator list.
 * The creator is always identified by the page.createdBy field.
 *
 * WHY this guard exists:
 * The page creator is the implicit owner. Removing them would orphan the page —
 * no one would have guaranteed EDITOR access. This constraint is enforced at the
 * application layer (not a DB constraint) to provide a descriptive error message.
 */

import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function guardCreator(
  pageId: string,
  targetUserId: string,
  db: PrismaClient
): Promise<void> {
  const page = await db.page.findUnique({
    where: { id: pageId },
    select: { createdBy: true },
  });

  if (page?.createdBy === targetUserId) {
    throw AppError.forbidden(
      "Cannot remove the page creator from collaborators"
    );
  }
}
