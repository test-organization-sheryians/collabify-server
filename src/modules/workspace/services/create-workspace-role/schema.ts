import { z } from "zod";

export const CreateWorkspaceRoleSchema = z.object({
  workspaceId: z.string().cuid(),
  name: z.string().min(1).max(50).trim(),
  description: z.string().max(200).trim().optional(),
  rank: z.number().int().min(1).max(99), // 100 = OWNER (reserved system max)
  actorUserId: z.string().min(1),

});

export type CreateWorkspaceRoleInput = z.infer<typeof CreateWorkspaceRoleSchema>;
