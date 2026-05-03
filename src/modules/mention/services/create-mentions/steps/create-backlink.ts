/**
 * Step: Create Backlink
 *
 * Creates a backlink record if the target entity type warrants one.
 * Only entities in BACKLINK_TARGET_TYPES create backlinks.
 * User mentions (USER target type) do NOT create backlinks.
 *
 * This is best-effort — failures are logged but not thrown.
 */
import type { ServiceContext } from "@/graphql/types";
import { BACKLINK_TARGET_TYPES, CONTEXT_MAX_LENGTH } from "@/modules/mention/constants";

export async function createBacklink(
  input: {
    sourceEntityId: string;
    sourceEntityType: string;
    targetEntityId: string;
    targetEntityType: string;
    mentionId: string;
    displayText: string;
  },
  ctx: ServiceContext
): Promise<void> {
  if (!BACKLINK_TARGET_TYPES.has(input.targetEntityType)) {
    return;
  }

  // upsert on (sourceEntityId, targetEntityId) — the unique constraint on the
  // Backlink table. A source entity can mention the same target in multiple
  // blocks; we only ever need ONE backlink row per (source → target) pair.
  // The `update: {}` means: if it already exists, leave it untouched.
  await ctx.db.backlink.upsert({
    where: {
      sourceEntityId_targetEntityId: {
        sourceEntityId: input.sourceEntityId,
        targetEntityId: input.targetEntityId,
      },
    },
    create: {
      sourceEntityId:   input.sourceEntityId,
      sourceEntityType: input.sourceEntityType,
      targetEntityId:   input.targetEntityId,
      targetEntityType: input.targetEntityType,
      mentionId:        input.mentionId,
      context:          input.displayText.slice(0, CONTEXT_MAX_LENGTH),
    },
    update: {}, // Already exists — keep as-is
  });
}
