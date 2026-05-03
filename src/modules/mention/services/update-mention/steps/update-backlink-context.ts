/**
 * Step: Update Backlink Context
 *
 * Updates the context field on all backlinks pointing to this mention.
 * Called when displayText changes — keeps backlink context in sync.
 *
 * This is best-effort — failures are logged but not thrown.
 */
import type { ServiceContext } from "@/graphql/types";
import { CONTEXT_MAX_LENGTH } from "@/modules/mention/constants";

export async function updateBacklinkContext(
  mentionId: string,
  displayText: string,
  ctx: ServiceContext
): Promise<void> {
  await ctx.db.backlink.updateMany({
    where: { mentionId },
    data: { context: displayText.slice(0, CONTEXT_MAX_LENGTH) },
  });
}
