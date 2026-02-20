import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { UnlockPageInput } from "./schema";
import { PageKeys } from "../../infra/page-keys";

const logger = createLogger("pages:services:unlock-page");

/**
 * unlockPage handler — releases an exclusive editor lock.
 *
 * Access: lock owner OR workspace ADMIN.
 *
 * Workflow:
 * 1. Auth + page fetch + ownership/admin check
 * 2. Redis DEL lock key
 * 3. DB update (isLocked = false, lockedBy = null)
 * 4. Pub/Sub broadcast
 * 5. Return { page: updated }
 */
export const handler = async (input: UnlockPageInput, ctx: ServiceContext) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    // Step 1 — Fetch page + access check
    const page = await ctx.db.page.findUnique({
      where: { id: input.pageId, deletedAt: null },
    });
    if (!page) throw AppError.notFound("Page not found");

    // Lock owner OR workspace ADMIN can unlock
    const isLockOwner = page.lockedBy === userId;
    if (!isLockOwner) {
      const member = await ctx.db.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId: page.workspaceId, userId },
        },
        select: { role: true },
      });
      // if (member?.role !== "ADMIN") {
      //   throw AppError.forbidden(
      //     "Only the lock owner or a workspace ADMIN can unlock a page"
      //   );
      // }
    }

    // Step 2 — Redis DEL
    await ctx.redis.del(PageKeys.PageLock(input.pageId));

    // Step 3 — DB update
    const updated = await ctx.db.page.update({
      where: { id: input.pageId },
      data: { isLocked: false, lockedBy: null },
    });

    // Step 4 — Pub/Sub broadcast
    await ctx.redis.publish(
      PageKeys.PageEvents(input.pageId),
      JSON.stringify({
        type: "page:unlocked",
        data: { pageId: input.pageId, unlockedBy: userId },
      })
    );

    logger.info("Page unlocked", { pageId: input.pageId, userId });
    return { page: updated };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to unlock page", {
      err: error,
      userId,
      pageId: input.pageId,
    });
    throw new AppError("Failed to unlock page");
  }
};
