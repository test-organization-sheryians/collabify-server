/**
 * Step: Soft Delete Mentions
 *
 * Sets mention status to ORPHANED when the target entity is deleted.
 */
import type { ServiceContext } from "@/graphql/types";

export async function orphanMentionsByTarget(
  targetEntityId: string,
  ctx: ServiceContext
): Promise<number> {
  const result = await ctx.db.mention.updateMany({
    where: { targetEntityId, status: "ACTIVE" },
    data: { status: "ORPHANED" },
  });

  return result.count;
}
