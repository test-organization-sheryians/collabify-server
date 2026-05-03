/**
 * Step 1 — Fetch Page
 *
 * Loads the page record from DB with a deletedAt: null guard so soft-deleted
 * pages are treated as not found rather than returning stale data.
 *
 * WHY findFirst (not findUnique):
 * The existing code uses findFirst. A future improvement can switch to
 * findUnique since `id` is the primary key — see improvement plan in README.
 */

import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";
import type { PageRow } from "../types";

export async function fetchPage(
  pageId: string,
  db: PrismaClient
): Promise<PageRow> {
  const page = await db.page.findFirst({
    where: { id: pageId, deletedAt: null },
  });

  if (!page) throw AppError.notFound("Page not found");

  return page;
}
