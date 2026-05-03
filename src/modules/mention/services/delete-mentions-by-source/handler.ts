/**
 * deleteMentionsBySource — Service Handler
 *
 * Soft-deletes all mentions from a source entity.
 * Called when the source entity content is deleted (e.g., message deletion).
 *
 * Steps:
 *   1. fetchMentions      — fetch all mentions from source
 *   2. softDeleteBySource — set status to REMOVED
 *   3. emitEvents        — Redis pub/sub
 *   4. logAudit          — MentionEvent records
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { DeleteMentionsBySourceInput } from "./schema";
import type { DeleteMentionsBySourceResult } from "./types";
import { fetchMentionsBySource } from "./steps/fetch-mentions";
import { softDeleteBySource } from "./steps/soft-delete-mentions";
import { emitMentionsRemovedEvents } from "./steps/emit-events";
import { logMentionsRemovedBySource } from "./steps/log-audit";

const logger = createLogger("mention:services:delete-mentions-by-source");

export const handler = async (
  input: DeleteMentionsBySourceInput,
  ctx: ServiceContext
): Promise<DeleteMentionsBySourceResult> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized();

  try {
    const mentions = await fetchMentionsBySource(input.sourceEntityId, ctx);
    const count = await softDeleteBySource(input.sourceEntityId, ctx);
    await emitMentionsRemovedEvents(mentions, ctx).catch(() => {});
    await logMentionsRemovedBySource(mentions, ctx).catch(() => {});

    logger.info("Mentions deleted by source", {
      sourceEntityId: input.sourceEntityId,
      count,
      userId,
    });
    return { count };
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error("deleteMentionsBySource failed", { err, userId });
    throw new AppError("Failed to delete mentions by source");
  }
};
