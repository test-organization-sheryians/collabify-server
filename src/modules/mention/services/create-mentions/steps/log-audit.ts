/**
 * Step: Log Audit
 *
 * Writes a MentionEvent record to the database for audit trail.
 * Records who created the mention and the mention's state.
 *
 * This is best-effort — failures are logged but not thrown.
 */
import type { ServiceContext } from "@/graphql/types";
import type { MentionRecord } from "@/modules/mention/types";

export type AuditEventType = "CREATED" | "UPDATED" | "REMOVED" | "ORPHANED";

export async function logMentionCreated(
  mentionId: string,
  mention: MentionRecord,
  ctx: ServiceContext
): Promise<void> {
  await ctx.db.mentionEvent.create({
    data: {
      mentionId,
      eventType: "CREATED",
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
