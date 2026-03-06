import { z } from "zod";

export const GetWorkspaceUserSchema = z.object({
  workspaceId: z.string(),
  userId: z.string(),
  actorUserId: z.string(),
});

export type GetWorkspaceUserInput = z.infer<typeof GetWorkspaceUserSchema>;
