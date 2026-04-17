/**
 * Step: Soft Delete Mentions
 *
 * Sets mention status to REMOVED for all mentions from a source entity.
 */
import type { ServiceContext } from "@/graphql/types";

export async function softDeleteBySource(
  sourceEntityId: string,
  ctx: ServiceContext
): Promise<number> {
  const result = await ctx.db.mention.updateMany({
    where: { sourceEntityId, status: "ACTIVE" },
    data: { status: "REMOVED" },
  });

  return result.count;
}
