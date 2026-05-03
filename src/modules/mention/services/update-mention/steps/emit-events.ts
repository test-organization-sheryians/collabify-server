/**
 * Step: Emit Events
 *
 * Publishes a mention.updated event to Redis for real-time subscriptions.
 *
 * This is best-effort — failures are logged but not thrown.
 */
import type { ServiceContext } from "@/graphql/types";
import type { MentionRecord } from "@/modules/mention/types";
import { emitMentionCreatedEvent, type MentionEventType } from "../../create-mentions/steps/emit-events";

export async function emitMentionUpdatedEvent(
  mention: MentionRecord,
  ctx: ServiceContext
): Promise<void> {
  if (!ctx.redis) {
    console.warn("[mention-events] Redis not available, skipping event emission");
    return;
  }

  const payload = {
    event: "mention.updated" as MentionEventType,
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
