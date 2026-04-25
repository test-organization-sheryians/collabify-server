import { z } from 'zod'

export const GetMentionsBySourceIdsSchema = z.object({
  sourceIds: z.array(z.string()).min(1).max(100),
})

export type GetMentionsBySourceIdsInput = z.infer<typeof GetMentionsBySourceIdsSchema>
