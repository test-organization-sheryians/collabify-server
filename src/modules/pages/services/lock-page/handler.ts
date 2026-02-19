import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { LockPageInput } from "./schema";
import { PageKeys, PageTTLs } from "../../infra/page-keys";

const logger = createLogger("pages:services:lock-page");

/**
 * lockPage handler
 *
 * Acquires an exclusive editor lock via Redis SET NX with 1h TTL.
 * Returns 423-equivalent if another user holds the lock.
 *
 * Workflow:
 * 1. Auth
 * 2. Page + collaborator check
 * 3. Redis SET NX — acquire lock
 * 4. Pub/Sub broadcast page-locked
 */
export const handler = async (input: LockPageInput, ctx: ServiceContext) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    // Step 1 — Fetch + auth
    // TODO: const page = await ctx.db.page.findUnique({ where: { id: input.pageId, deletedAt: null } })
    // TODO: if (!page) throw AppError.notFound("Page not found")
    // TODO: const collab = await ctx.db.pageCollaborator.findUnique({ where: { pageId: input.pageId, userId } })
    // TODO: if (!collab) throw AppError.forbidden("Not a collaborator on this page")

    // Step 2 — Acquire Redis lock (SET NX EX)
    // TODO: const acquired = await ctx.redis.set(PageKeys.PageLock(input.pageId), userId, 'EX', PageTTLs.LOCK, 'NX')
    // TODO: if (!acquired) {
    //   const currentHolder = await ctx.redis.get(PageKeys.PageLock(input.pageId))
    //   if (currentHolder === userId) {
    //     // Idempotent: caller already holds the lock — refresh TTL and return
    //     await ctx.redis.expire(PageKeys.PageLock(input.pageId), PageTTLs.LOCK)
    //   } else {
    //     throw new AppError("Page is locked by another user", "PAGE_LOCKED")
    //   }
    // }

    // Step 3 — DB update (persist lock state for GraphQL read models + offline access)
    // TODO: const updated = await ctx.db.page.update({ where: { id: input.pageId }, data: { isLocked: true, lockedBy: userId } })

    // Step 4 — Pub/Sub broadcast
    // TODO: await ctx.redis.publish(PageKeys.PageEvents(input.pageId), JSON.stringify({ type: 'page:locked', data: { pageId: input.pageId, lockedBy: userId } }))

    // logger.info("Page locked", { pageId: input.pageId, userId })
    // return { page: updated }

    throw new AppError("lockPage: not yet implemented", "INTERNAL_SERVER_ERROR");
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
