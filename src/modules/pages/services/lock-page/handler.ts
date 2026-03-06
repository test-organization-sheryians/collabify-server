/**
 * lockPage — Service Handler
 *
 * Acquires an exclusive editor lock on a page using Redis SET NX EX.
 * Idempotent for the lock owner (re-extends TTL). Rejects if another user holds the lock.
 *
 * Execution:
 *   Step 1 — checkAccess   : page exists + EDITOR role gate
 *   Step 2 — acquireLock   : SET NX EX → conflict / acquired / re-extend (idempotent)
 *   Step 3 — updateDb      : page.update({ isLocked: true, lockedBy }) — DB mirrors Redis
 *   Step 4 — broadcast     : PUBLISH page:locked (best-effort)
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { LockPageInput } from "./schema";
import { checkAccess } from "./steps/check-access";
import { acquireLock } from "./steps/acquire-lock";
import { updateDb } from "./steps/update-db";
import { broadcast } from "./steps/broadcast";

const logger = createLogger("pages:services:lock-page");

export const handler = async (input: LockPageInput, ctx: ServiceContext) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    // Step 1 — EDITOR gate
    await checkAccess(input.pageId, userId, ctx.db);

    // Step 2 — atomic lock acquisition (SET NX + idempotency)
    await acquireLock(input.pageId, userId, ctx.redis);

    // Step 3 — DB update (mirror lock state for persistence)
    const page = await updateDb(input.pageId, userId, ctx.db);

    // Step 4 — broadcast (best-effort)
    await broadcast(input.pageId, userId, ctx.redis).catch((err) =>
      logger.error("Broadcast failed after lock", { err, pageId: input.pageId })
    );

    logger.info("Page locked", { pageId: input.pageId, userId });
    return { page };
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
