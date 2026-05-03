/**
 * Step: Soft Delete Mentions
 *
 * Sets mention status to REMOVED (soft-delete).
 * Does NOT delete backlinks — they remain for historical reference.
 */
import type { ServiceContext } from "@/graphql/types";

export async function softDeleteMentions(
  mentionIds: string[],
  ctx: ServiceContext
): Promise<void> {
  await ctx.db.mention.updateMany({
    where: { id: { in: mentionIds } },
    data: { status: "REMOVED" },
  });
}
