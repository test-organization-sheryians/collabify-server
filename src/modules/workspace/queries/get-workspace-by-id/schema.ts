import { z } from "zod";

export const GetWorkspaceByIdSchema = z.object({
  workspaceId: z.string(),
  actorUserId: z.string(),
});

export type GetWorkspaceByIdInput = z.infer<typeof GetWorkspaceByIdSchema>;
