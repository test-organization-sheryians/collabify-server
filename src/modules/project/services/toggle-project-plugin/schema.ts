import { z } from 'zod'

export const ToggleProjectPluginSchema = z.object({
  projectId: z.string().min(1),
  workspaceId: z.string().min(1),
  type: z.enum(['CHAT', 'WHITEBOARD', 'PAGES', 'VAULT', 'ISSUES']),
  enable: z.boolean(),
  actorUserId: z.string().min(1),
})

export type ToggleProjectPluginInput = z.infer<typeof ToggleProjectPluginSchema>
