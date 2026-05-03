/**
 * Step: Update Mention Record
 *
 * Updates the displayText and/or sourceLocation of a mention.
 * Returns the updated MentionRecord for downstream steps.
 */
import type { ServiceContext } from "@/graphql/types";
import type { MentionRecord } from "@/modules/mention/types";

export async function updateMentionRecord(
  mentionId: string,
  updates: { displayText?: string; sourceLocation?: Record<string, unknown> },
  ctx: ServiceContext
): Promise<MentionRecord> {
  const updated = await ctx.db.mention.update({
    where: { id: mentionId },
    data: {
      displayText: updates.displayText,
      sourceLocation: updates.sourceLocation as any,
    },
  });

  return mapMention(updated);
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
