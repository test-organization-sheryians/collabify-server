import { z } from 'zod'
import { db } from '@/infra/db'
import type { ServiceContext } from '@/graphql/types'
import { createLogger } from '@/shared/lib/logger'

const log = createLogger('mention:get-by-source-ids')

export const GetMentionsBySourceIdsSchema = z.object({
  sourceIds: z.array(z.string()).min(1).max(100),
})

export type GetMentionsBySourceIdsInput = z.infer<typeof GetMentionsBySourceIdsSchema>

export interface MentionRef {
  entityId: string
  entityType: string
  displayText: string
}

export interface MentionResult {
  sourceId: string
  mentions: MentionRef[]
}

/**
 * Batch fetch mentions for a list of message (sourceEntityId) IDs.
 * Used to reconstruct rich content with mentions for GraphQL responses.
 */
export async function handler(
  input: GetMentionsBySourceIdsInput,
  _ctx: ServiceContext
): Promise<MentionResult[]> {
  const { sourceIds } = GetMentionsBySourceIdsSchema.parse(input)

  log.debug('Fetching mentions for source IDs', { count: sourceIds.length })

  // Batch fetch all mentions for the given source IDs
  const mentions = await db.mention.findMany({
    where: {
      sourceEntityId: { in: sourceIds },
      sourceEntityType: 'CHAT_MESSAGE',
    },
    select: {
      id: true,
      sourceEntityId: true,
      targetEntityId: true,
      targetEntityType: true,
      displayText: true,
    },
    orderBy: { id: 'asc' }, // deterministic order
  })

  log.debug('Found mentions', { count: mentions.length })

  // Group mentions by sourceEntityId
  const mentionMap = new Map<string, MentionRef[]>()

  for (const mention of mentions) {
    const existing = mentionMap.get(mention.sourceEntityId) ?? []
    existing.push({
      entityId: mention.targetEntityId,
      entityType: mention.targetEntityType,
      displayText: mention.displayText,
    })
    mentionMap.set(mention.sourceEntityId, existing)
  }

  // Return in same order as sourceIds
  return sourceIds.map((sourceId) => ({
    sourceId,
    mentions: mentionMap.get(sourceId) ?? [],
  }))
}
