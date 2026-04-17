/**
 * Step: Fetch Mention
 *
 * Fetches an existing mention record by ID.
 * Throws NOT_FOUND if the mention does not exist.
 */
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { MentionRecord } from "@/modules/mention/types";

export async function fetchMention(
  mentionId: string,
  ctx: ServiceContext
): Promise<MentionRecord> {
  const existing = await ctx.db.mention.findUnique({
    where: { id: mentionId },
  });

  if (!existing) {
    throw AppError.notFound("Mention not found");
  }

  return mapMention(existing);
}

function mapMention(m: any): MentionRecord {
  return {
    id: m.id,
    sourceEntityId: m.sourceEntityId,
    sourceEntityType: m.sourceEntityType,
    targetEntityId: m.targetEntityId,
    targetEntityType: m.targetEntityType,
    displayText: m.displayText,
    sourceLocation: m.sourceLocation,
    tier: m.tier,
    status: m.status,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    createdById: m.createdById,
  };
}
