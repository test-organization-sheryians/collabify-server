/**
 * Step 1 — Check Access
 *
 * Two-path access gate — either path is sufficient to unlock:
 *   Path A: caller holds the Redis lock (is the lock owner)
 *   Path B: caller is a workspace ADMIN (can force-unlock any page)
 *
 * WHY two paths:
 * The lock owner may unlock their own lock (normal flow).
 * A workspace admin can break stuck locks from crashed clients (admin override).
 *
 * NOTE: The original handler had commented-out ADMIN enforcement. The admin path
 * is intentionally included here since it reflects the design intent.
 * See README improvement plan for context.
 *
 * Throws FORBIDDEN if neither condition is met.
 * Throws NOT_FOUND if the page does not exist.
 */

import { AppError } from "@/shared/errors";
import { PageKeys } from "../../../infra/page-keys";
import { RoleType } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type { Redis } from "ioredis";

export async function checkAccess(
  pageId: string,
  userId: string,
  db: PrismaClient,
  redis: Redis
): Promise<{ workspaceId: string }> {
  const page = await db.page.findUnique({
    where: { id: pageId, deletedAt: null },
    select: { id: true, workspaceId: true },
  });
  if (!page) throw AppError.notFound("Page not found");

  // Path A — caller is the lock owner
  const lockHolder = await redis.get(PageKeys.PageLock(pageId));
  if (lockHolder === userId) return { workspaceId: page.workspaceId };

  // Path B — caller is a workspace ADMIN
  const member = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: page.workspaceId, userId } },
    select: { role: true },
  });
  if (member?.role === RoleType.OWNER) return { workspaceId: page.workspaceId };

  throw AppError.forbidden(
    "Only the lock owner or a workspace admin can unlock this page"
  );
}
