/**
 * Step: Fetch Mentions
 *
 * Fetches mention records before soft-delete.
 * Used to get the full record for event emission.
 */
import type { ServiceContext } from "@/graphql/types";
import type { MentionRecord } from "@/modules/mention/types";

export async function fetchMentionsForDelete(
  mentionIds: string[],
  ctx: ServiceContext
): Promise<MentionRecord[]> {
  const mentions = await ctx.db.mention.findMany({
    where: { id: { in: mentionIds }, status: "ACTIVE" },
  });

  return mentions.map(mapMention);
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
