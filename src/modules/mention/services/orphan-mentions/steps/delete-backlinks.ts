/**
 * Step: Delete Backlinks
 *
 * Deletes all backlinks associated with orphaned mentions.
 * Called when a target entity is deleted — backlinks are no longer valid.
 */
import type { ServiceContext } from "@/graphql/types";

export async function deleteBacklinksForMentions(
  mentionIds: string[],
  ctx: ServiceContext
): Promise<void> {
  if (mentionIds.length === 0) return;

  await ctx.db.backlink.deleteMany({
    where: { mentionId: { in: mentionIds } },
  });
}
