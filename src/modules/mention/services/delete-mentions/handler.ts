/**
 * deleteMentions — Service Handler
 *
 * Soft-deletes mentions by setting their status to REMOVED.
 * Backlinks are preserved for historical reference.
 *
 * Steps:
 *   1. fetchMentions      — fetch records before delete
 *   2. softDeleteMentions — set status to REMOVED
 *   3. emitEvents        — Redis pub/sub
 *   4. logAudit          — MentionEvent records
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { DeleteMentionsInput } from "./schema";
import type { DeleteMentionsResult } from "./types";
import { fetchMentionsForDelete } from "./steps/fetch-mentions";
import { softDeleteMentions } from "./steps/soft-delete-mentions";
import { emitMentionRemovedEvents } from "./steps/emit-events";
import { logMentionsRemoved } from "./steps/log-audit";

const logger = createLogger("mention:services:delete-mentions");

export const handler = async (
  input: DeleteMentionsInput,
  ctx: ServiceContext
): Promise<DeleteMentionsResult> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized();

  try {
    const mentions = await fetchMentionsForDelete(input.mentionIds, ctx);
    await softDeleteMentions(input.mentionIds, ctx);
    await emitMentionRemovedEvents(mentions, ctx).catch(() => {});
    await logMentionsRemoved(mentions, ctx).catch(() => {});

    logger.info("Mentions deleted", { count: mentions.length, userId });
    return { success: true };
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error("deleteMentions failed", { err, userId });
    throw new AppError("Failed to delete mentions");
  }
};
