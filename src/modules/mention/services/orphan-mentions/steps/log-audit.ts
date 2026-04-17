/**
 * Step: Log Audit
 */
import type { ServiceContext } from "@/graphql/types";
import type { MentionRecord } from "@/modules/mention/types";

export async function logMentionsOrphaned(
  mentions: MentionRecord[],
  ctx: ServiceContext
): Promise<void> {
  const records = mentions.map((mention) => ({
    mentionId: mention.id,
    eventType: "ORPHANED" as const,
    payload: {
      sourceEntityId: mention.sourceEntityId,
      sourceEntityType: mention.sourceEntityType,
      targetEntityId: mention.targetEntityId,
      targetEntityType: mention.targetEntityType,
      displayText: mention.displayText,
      tier: mention.tier,
      status: "ORPHANED",
    },
    actorId: ctx.auth.userId ?? null,
  }));

  await ctx.db.mentionEvent.createMany({ data: records }).catch(() => {});
}
