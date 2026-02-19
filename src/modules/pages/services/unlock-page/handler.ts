import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { UnlockPageInput } from "./schema";
import { PageKeys } from "../../infra/page-keys";

const logger = createLogger("pages:services:unlock-page");

/**
 * unlockPage handler
 *
 * Lock owner can always release. Workspace ADMIN can force-release.
 *
 * Workflow:
 * 1. Auth
 * 2. Page + collaborator check
 * 3. Redis GET lock owner — verify caller is allowed to release
 * 4. DEL via Lua (ownership-safe)
 * 5. DB update
 * 6. Pub/Sub broadcast
 */
export const handler = async (input: UnlockPageInput, ctx: ServiceContext) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    // Step 1 — Fetch + auth
    // TODO: const page = await ctx.db.page.findUnique({ where: { id: input.pageId, deletedAt: null }, select: { id: true, isLocked: true, lockedBy: true, projectId: true } })
    // TODO: if (!page) throw AppError.notFound("Page not found")

    // Step 2 — Check lock ownership
    // TODO: const lockOwner = await ctx.redis.get(PageKeys.PageLock(input.pageId))
    // TODO: if (!lockOwner) return { page } // Already unlocked — idempotent
    // TODO: if (lockOwner !== userId) {
    //   // Admin override check
    //   const membership = await ctx.db.workspaceMember.findFirst({ where: { userId, workspace: { projects: { some: { id: page.projectId } } } }, select: { role: true } })
    //   if (!membership || membership.role !== 'ADMIN') throw AppError.forbidden("Only the lock owner or an admin can unlock this page")
    // }

    // Step 3 — Release lock via SNAPSHOT_LOCK_RELEASE_SCRIPT (safe ownership check)
    // Ordinary Redis DEL is fine here since we already verified ownership above.
    // TODO: await ctx.redis.del(PageKeys.PageLock(input.pageId))

    // Step 4 — DB update
    // TODO: const updated = await ctx.db.page.update({ where: { id: input.pageId }, data: { isLocked: false, lockedBy: null } })

    // Step 5 — Pub/Sub broadcast
    // TODO: await ctx.redis.publish(PageKeys.PageEvents(input.pageId), JSON.stringify({ type: 'page:unlocked', data: { pageId: input.pageId, unlockedBy: userId } }))

    // logger.info("Page unlocked", { pageId: input.pageId, userId })
    // return { page: updated }

    throw new AppError("unlockPage: not yet implemented", "INTERNAL_SERVER_ERROR");
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
