import { z } from 'zod'

export const markFilesUnreferencedSchema = z.object({
  fileIds: z.array(z.string().cuid()).min(1).max(100),
  entityId: z.string().cuid(),
  entityType: z.enum(['PAGE', 'TASK', 'WHITEBOARD']),
})

export type MarkFilesUnreferencedInput = z.infer<typeof markFilesUnreferencedSchema>
