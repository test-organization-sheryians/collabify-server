import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { LockPageInput } from "./schema";
import { PageKeys } from "../../infra/page-keys";

const logger = createLogger("pages:services:lock-page");

// Lock TTL: 1 hour safety net for crashed clients
const LOCK_TTL_SECONDS = 3600;

/**
 * lockPage handler — acquires exclusive editor lock on a page.
 *
 * Workflow:
 * 1. Auth + page fetch + EDITOR check
 * 2. Redis SET NX (atomic lock acquisition)
 * 3. DB update (isLocked = true, lockedBy = userId)
 * 4. Pub/Sub broadcast
 * 5. Return { page: updated }
 */
export const handler = async (input: LockPageInput, ctx: ServiceContext) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    // Step 1 — Fetch page + access check
    const page = await ctx.db.page.findUnique({
      where: { id: input.pageId, deletedAt: null },
    });
    if (!page) throw AppError.notFound("Page not found");

    const collab = await ctx.db.pageCollaborator.findUnique({
      where: { pageId_userId: { pageId: input.pageId, userId } },
    });
    if (!collab || collab.role !== "EDITOR") {
      throw AppError.forbidden("Only editors can lock a page");
    }

    // Step 2 — Redis SET NX for atomic lock acquisition
    const lockKey = PageKeys.PageLock(input.pageId);
    const acquired = await ctx.redis.set(
      lockKey,
      userId,
      "EX",
      LOCK_TTL_SECONDS,
      "NX"
    );
    if (!acquired) {
      const lockHolder = await ctx.redis.get(lockKey);
      if (lockHolder && lockHolder !== userId) {
        throw AppError.conflict(
          "Another user currently holds the lock on this page"
        );
      }
      // If lockHolder === userId, they already hold it — re-extend TTL
      await ctx.redis.expire(lockKey, LOCK_TTL_SECONDS);
    }

    // Step 3 — DB update
    const updated = await ctx.db.page.update({
      where: { id: input.pageId },
      data: { isLocked: true, lockedBy: userId },
    });

    // Step 4 — Pub/Sub broadcast
    await ctx.redis.publish(
      PageKeys.PageEvents(input.pageId),
      JSON.stringify({
        type: "page:locked",
        data: { pageId: input.pageId, lockedBy: userId },
      })
    );

    logger.info("Page locked", { pageId: input.pageId, userId });
    return { page: updated };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to lock page", {
      err: error,
      userId,
      pageId: input.pageId,
    });
    throw new AppError("Failed to lock page");
  }
};
