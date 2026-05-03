/**
 * Step: Emit Events
 *
 * Publishes a mention.created event to Redis for real-time subscriptions.
 * Uses the channel pattern: mention:events:{targetEntityId}
 *
 * This is best-effort — failures are logged but not thrown.
 */
import type { ServiceContext } from "@/graphql/types";
import type { MentionRecord } from "@/modules/mention/types";

export type MentionEventType = "mention.created" | "mention.updated" | "mention.removed" | "mention.orphaned";

export interface MentionEventPayload {
  event: MentionEventType;
  mention: MentionRecord;
  timestamp: string;
}

export async function emitMentionCreatedEvent(
  mention: MentionRecord,
  ctx: ServiceContext
): Promise<void> {
  if (!ctx.redis) {
    console.warn("[mention-events] Redis not available, skipping event emission");
    return;
  }

  const payload: MentionEventPayload = {
    event: "mention.created",
    mention,
    timestamp: new Date().toISOString(),
  };

  const channel = `mention:events:${mention.targetEntityId}`;

  try {
    await ctx.redis.publish(channel, JSON.stringify(payload));
  } catch (err) {
    console.error("[mention-events] Failed to emit event:", err);
  }
}
