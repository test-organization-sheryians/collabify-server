/**
 * createMentions — Service Handler
 *
 * Creates mentions from a source entity to target entities.
 * Supports upsert behavior: duplicate mentions are updated, not created twice.
 * Creates backlinks for entity targets (not for USER mentions).
 *
 * Steps:
 *   1. validateAccess       — assert source entity access
 *   2. createMentionRecord  — upsert mention record
 *   3. createBacklink      — backlink if target is an entity
 *   4. emitEvents          — Redis pub/sub
 *   5. logAudit            — MentionEvent record
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { CreateMentionsInput } from "./schema";
import type { CreateMentionsResult } from "./types";
import { validateAccess } from "./steps/validate-access";
import { createMentionRecord } from "./steps/create-mention-record";
import { createBacklink } from "./steps/create-backlink";
import { emitMentionCreatedEvent } from "./steps/emit-events";
import { logMentionCreated } from "./steps/log-audit";
import { VALID_SOURCE_TYPES, VALID_TARGET_TYPES } from "@/modules/mention/constants";

const logger = createLogger("mention:services:create-mentions");

export function determineTier(
  sourceEntityType: string,
  targetEntityType: string
): "TIER_1" | "TIER_2" | "TIER_3" {
  if (targetEntityType === "USER") {
    return "TIER_1";
  }
  if (sourceEntityType === "PAGE" || sourceEntityType === "ISSUE") {
    return "TIER_2";
  }
  return "TIER_3";
}

export const handler = async (
  input: CreateMentionsInput,
  ctx: ServiceContext
): Promise<CreateMentionsResult> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized();
  if (!ctx.authGate) throw AppError.unauthorized();

  try {
    const results = [];

    for (const mention of input.mentions) {
      if (mention.sourceEntityId === mention.targetEntityId) {
        throw AppError.badRequest("Entities cannot reference themselves");
      }

      if (!VALID_SOURCE_TYPES.has(mention.sourceEntityType)) {
        throw AppError.badRequest(
          `Invalid source type: ${mention.sourceEntityType}. Only PAGE, ISSUE, or CHAT_MESSAGE can create mentions.`
        );
      }

      if (!VALID_TARGET_TYPES.has(mention.targetEntityType)) {
        throw AppError.badRequest(`Invalid target type: ${mention.targetEntityType}`);
      }

      await validateAccess(mention, ctx, userId);

      const tier = determineTier(mention.sourceEntityType, mention.targetEntityType);
      const record = await createMentionRecord(mention, userId, tier, ctx);

      await createBacklink(
        {
          sourceEntityId: mention.sourceEntityId,
          sourceEntityType: mention.sourceEntityType,
          targetEntityId: mention.targetEntityId,
          targetEntityType: mention.targetEntityType,
          mentionId: record.id,
          displayText: mention.displayText,
        },
        ctx
      );

      await emitMentionCreatedEvent(record, ctx).catch(() => {});
      await logMentionCreated(record.id, record, ctx).catch(() => {});

      results.push(record);
    }

    logger.info("Mentions created", { count: results.length, userId });
    return { mentions: results };
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error("createMentions failed", { err, userId });
    throw new AppError("Failed to create mentions");
  }
};
