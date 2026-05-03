/**
 * updateMention — Service Handler
 *
 * Updates the displayText and/or sourceLocation of an existing mention.
 * Also updates backlink context when displayText changes.
 *
 * Steps:
 *   1. fetchMention           — fetch existing mention
 *   2. updateMentionRecord   — apply updates
 *   3. updateBacklinkContext — sync backlink context
 *   4. emitEvents            — Redis pub/sub
 *   5. logAudit              — MentionEvent record
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { UpdateMentionInput } from "./schema";
import type { UpdateMentionResult } from "./types";
import { fetchMention } from "./steps/fetch-mention";
import { updateMentionRecord } from "./steps/update-mention-record";
import { updateBacklinkContext } from "./steps/update-backlink-context";
import { emitMentionUpdatedEvent } from "./steps/emit-events";
import { logMentionUpdated } from "./steps/log-audit";

const logger = createLogger("mention:services:update-mention");

export const handler = async (
  input: UpdateMentionInput,
  ctx: ServiceContext
): Promise<UpdateMentionResult> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized();

  try {
    await fetchMention(input.input.mentionId, ctx);

    const updated = await updateMentionRecord(
      input.input.mentionId,
      {
        displayText: input.input.displayText,
        sourceLocation: input.input.sourceLocation,
      },
      ctx
    );

    if (input.input.displayText) {
      await updateBacklinkContext(input.input.mentionId, input.input.displayText, ctx);
    }

    await emitMentionUpdatedEvent(updated, ctx).catch(() => {});
    await logMentionUpdated(updated.id, updated, ctx).catch(() => {});

    logger.info("Mention updated", { mentionId: updated.id, userId });
    return { mention: updated };
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error("updateMention failed", { err, userId });
    throw new AppError("Failed to update mention");
  }
};
