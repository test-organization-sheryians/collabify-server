/**
 * Step: Fetch Backlinks
 *
 * Fetches backlinks for a target entity with cursor-based pagination.
 * Supports filtering by sourceType, actorId, dateFrom, dateTo.
 * Includes the associated Mention record for each backlink.
 */
import type { ServiceContext } from "@/graphql/types";
import type { BacklinkResult, BacklinkWithMention } from "@/modules/mention/types";
import type { GetBacklinksInput } from "../schema";

export async function fetchBacklinks(
  input: GetBacklinksInput,
  ctx: ServiceContext
): Promise<BacklinkResult> {
  const where: any = { targetEntityId: input.targetEntityId };

  if (input.cursor) {
    where.id = { gt: input.cursor };
  }

  if (input.filters?.sourceType) {
    where.sourceEntityType = input.filters.sourceType;
  }

  if (input.filters?.actorId) {
    where.mention = { createdById: input.filters.actorId };
  }

  if (input.filters?.dateFrom || input.filters?.dateTo) {
    where.createdAt = {};
    if (input.filters.dateFrom) {
      where.createdAt.gte = new Date(input.filters.dateFrom);
    }
    if (input.filters.dateTo) {
      where.createdAt.lte = new Date(input.filters.dateTo);
    }
  }

  const backlinks = await ctx.db.backlink.findMany({
    where,
    take: input.limit + 1,
    orderBy: { createdAt: "desc" },
    include: { mention: true },
  });

  const hasMore = backlinks.length > input.limit;
  const results = hasMore ? backlinks.slice(0, -1) : backlinks;

  const mapped: BacklinkWithMention[] = results.map((bl) => ({
    id: bl.id,
    sourceEntityId: bl.sourceEntityId,
    sourceEntityType: bl.sourceEntityType,
    targetEntityId: bl.targetEntityId,
    targetEntityType: bl.targetEntityType,
    mentionId: bl.mentionId,
    context: bl.context,
    createdAt: bl.createdAt,
    sourceMention: {
      id: bl.mention.id,
      sourceEntityId: bl.mention.sourceEntityId,
      sourceEntityType: bl.mention.sourceEntityType,
      targetEntityId: bl.mention.targetEntityId,
      targetEntityType: bl.mention.targetEntityType,
      displayText: bl.mention.displayText,
      sourceLocation: bl.mention.sourceLocation as Record<string, unknown> | null,
      tier: bl.mention.tier,
      status: bl.mention.status,
      createdAt: bl.mention.createdAt,
      updatedAt: bl.mention.updatedAt,
      createdById: bl.mention.createdById,
    },
  }));

  const total = await ctx.db.backlink.count({
    where: { targetEntityId: input.targetEntityId },
  });

  return {
    backlinks: mapped,
    total,
    hasMore,
  };
}
