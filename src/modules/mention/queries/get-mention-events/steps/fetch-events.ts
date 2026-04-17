/**
 * Step: Fetch Events
 *
 * Fetches MentionEvent records for a specific mention.
 */
import type { ServiceContext } from "@/graphql/types";
import type { MentionEventRecord } from "@/modules/mention/types";

export async function fetchMentionEvents(
  mentionId: string,
  ctx: ServiceContext
): Promise<MentionEventRecord[]> {
  const events = await ctx.db.mentionEvent.findMany({
    where: { mentionId },
    orderBy: { createdAt: "desc" },
  });

  return events.map((e) => ({
    id: e.id,
    mentionId: e.mentionId,
    eventType: e.eventType as any,
    payload: e.payload as Record<string, unknown>,
    actorId: e.actorId,
    createdAt: e.createdAt,
  }));
}
