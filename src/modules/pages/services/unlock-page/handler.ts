/**
 * unlockPage — Service Handler
 *
 * Releases the exclusive editor lock on a page.
 * Access: lock owner OR workspace admin.
 *
 * Execution:
 *   Step 1 — checkAccess   : lock owner (Redis GET) OR workspace admin gate
 *   Step 2 — releaseLock   : DEL PageLock key (idempotent)
 *   Step 3 — updateDb      : page.update({ isLocked: false, lockedBy: null })
 *   Step 4 — broadcast     : PUBLISH page:unlocked (best-effort)
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { UnlockPageInput } from "./schema";
import { checkAccess } from "./steps/check-access";
import { releaseLock } from "./steps/release-lock";
import { updateDb } from "./steps/update-db";
import { broadcast } from "./steps/broadcast";

const logger = createLogger("pages:services:unlock-page");

export const handler = async (input: UnlockPageInput, ctx: ServiceContext) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    // Step 1 — lock owner OR workspace admin gate
    await checkAccess(input.pageId, userId, ctx.db, ctx.redis);

    // Step 2 — release Redis lock
    await releaseLock(input.pageId, ctx.redis);

    // Step 3 — DB update (mirror lock release)
    const page = await updateDb(input.pageId, ctx.db);

    // Step 4 — broadcast (best-effort)
    await broadcast(input.pageId, userId, ctx.redis).catch((err) =>
      logger.error("Broadcast failed after unlock", {
        err,
        pageId: input.pageId,
      })
    );

    logger.info("Page unlocked", { pageId: input.pageId, userId });
    return { page };
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
