/**
 * Step 2 — Validate Users
 *
 * Batch-checks that all target userIds exist in the DB before any writes.
 * Fails fast with a list of missing IDs, preventing partial upserts.
 */

import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

export async function validateUsers(
  targetIds: string[],
  db: PrismaClient
): Promise<void> {
  const existing = await db.user.findMany({
    where: { id: { in: targetIds } },
    select: { id: true },
  });

  const foundIds = new Set(existing.map((u) => u.id));
  const missing = targetIds.filter((id) => !foundIds.has(id));

  if (missing.length > 0) {
    throw AppError.notFound(`Users not found: ${missing.join(", ")}`);
  }
}
