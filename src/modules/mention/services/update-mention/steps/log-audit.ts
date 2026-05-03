/**
 * Step: Log Audit
 *
 * Writes a MentionEvent record for the update action.
 *
 * This is best-effort — failures are logged but not thrown.
 */
import type { ServiceContext } from "@/graphql/types";
import type { MentionRecord } from "@/modules/mention/types";

export async function logMentionUpdated(
  mentionId: string,
  mention: MentionRecord,
  ctx: ServiceContext
): Promise<void> {
  await ctx.db.mentionEvent.create({
    data: {
      mentionId,
      eventType: "UPDATED",
      payload: {
        sourceEntityId: mention.sourceEntityId,
        sourceEntityType: mention.sourceEntityType,
        targetEntityId: mention.targetEntityId,
        targetEntityType: mention.targetEntityType,
        displayText: mention.displayText,
        tier: mention.tier,
        status: mention.status,
      },
      actorId: ctx.auth.userId ?? null,
    },
  });
}
