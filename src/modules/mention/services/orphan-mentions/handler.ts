/**
 * orphanMentions — Service Handler
 *
 * Marks all mentions targeting a deleted entity as ORPHANED.
 * Also deletes associated backlinks since they're no longer valid.
 * Called by entity delete handlers (pages, issues, vault, whiteboard).
 *
 * Steps:
 *   1. fetchMentions         — fetch mentions before orphaning
 *   2. orphanMentionsByTarget — set status to ORPHANED
 *   3. deleteBacklinks       — remove associated backlinks
 *   4. emitEvents           — Redis pub/sub
 *   5. logAudit              — MentionEvent records
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { OrphanMentionsInput } from "./schema";
import type { OrphanMentionsResult } from "./types";
import { fetchMentionsByTarget } from "./steps/fetch-mentions";
import { orphanMentionsByTarget } from "./steps/soft-delete-mentions";
import { deleteBacklinksForMentions } from "./steps/delete-backlinks";
import { emitMentionsOrphanedEvents } from "./steps/emit-events";
import { logMentionsOrphaned } from "./steps/log-audit";

const logger = createLogger("mention:services:orphan-mentions");

export const handler = async (
  input: OrphanMentionsInput,
  ctx: ServiceContext
): Promise<OrphanMentionsResult> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized();

  try {
    const mentions = await fetchMentionsByTarget(input.targetEntityId, ctx);
    const count = await orphanMentionsByTarget(input.targetEntityId, ctx);
    
    const mentionIds = mentions.map((m) => m.id);
    await deleteBacklinksForMentions(mentionIds, ctx);

    await emitMentionsOrphanedEvents(mentions, ctx).catch(() => {});
    await logMentionsOrphaned(mentions, ctx).catch(() => {});

    logger.info("Mentions orphaned", {
      targetEntityId: input.targetEntityId,
      count,
      userId,
    });
    return { count };
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error("orphanMentions failed", { err, userId });
    throw new AppError("Failed to orphan mentions");
  }
};
