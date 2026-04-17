/**
 * Step: Emit Events
 *
 * Publishes mention.removed events to Redis for real-time subscriptions.
 *
 * This is best-effort — failures are logged but not thrown.
 */
import type { ServiceContext } from "@/graphql/types";
import type { MentionRecord } from "@/modules/mention/types";

export async function emitMentionRemovedEvents(
  mentions: MentionRecord[],
  ctx: ServiceContext
): Promise<void> {
  if (!ctx.redis || mentions.length === 0) return;

  const results = mentions.map((mention) => ({
    event: "mention.removed" as const,
    mention,
    timestamp: new Date().toISOString(),
  }));

  const channel = `mention:events:${mentions[0].targetEntityId}`;

  try {
    await ctx.redis.publish(channel, JSON.stringify(results));
  } catch (err) {
    console.error("[mention-events] Failed to emit events:", err);
  }
}
