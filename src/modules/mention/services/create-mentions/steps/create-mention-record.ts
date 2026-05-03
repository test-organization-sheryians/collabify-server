/**
 * Step: Create Mention Record
 *
 * Creates or updates a mention record. Implements upsert behavior:
 * - If a mention with same sourceEntityId + targetEntityId + sourceLocation exists
 *   and is ACTIVE, update it instead of creating a duplicate.
 * - Otherwise, create a new record with ACTIVE status.
 *
 * Returns the mapped MentionRecord for downstream steps.
 */
import type { ServiceContext } from "@/graphql/types";
import type { MentionRecord, MentionTier } from "@/modules/mention/types";
import type { CreateMentionInput } from "../schema";

export async function createMentionRecord(
  input: CreateMentionInput,
  createdById: string,
  tier: MentionTier,
  ctx: ServiceContext
): Promise<MentionRecord> {
  const existing = await ctx.db.mention.findFirst({
    where: {
      sourceEntityId: input.sourceEntityId,
      targetEntityId: input.targetEntityId,
      status: "ACTIVE",
    },
  });

  if (existing) {
    const updated = await ctx.db.mention.update({
      where: { id: existing.id },
      data: {
        displayText: input.displayText,
        sourceLocation: input.sourceLocation as any,
      },
    });
    return mapMention(updated);
  }

  const created = await ctx.db.mention.create({
    data: {
      sourceEntityId: input.sourceEntityId,
      sourceEntityType: input.sourceEntityType,
      targetEntityId: input.targetEntityId,
      targetEntityType: input.targetEntityType,
      displayText: input.displayText,
      sourceLocation: input.sourceLocation as any,
      tier,
      status: "ACTIVE",
      createdById,
    },
  });

  return mapMention(created);
}

function mapMention(m: any): MentionRecord {
  return {
    id: m.id,
    sourceEntityId: m.sourceEntityId,
    sourceEntityType: m.sourceEntityType,
    targetEntityId: m.targetEntityId,
    targetEntityType: m.targetEntityType,
    displayText: m.displayText,
    sourceLocation: m.sourceLocation,
    tier: m.tier,
    status: m.status,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    createdById: m.createdById,
  };
}
