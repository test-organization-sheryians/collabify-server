import { z } from "zod";

export const DeleteWorkspaceSchema = z.object({
  workspaceId: z.string(),
  actorUserId: z.string(),
});

export type DeleteWorkspaceInput = z.infer<typeof DeleteWorkspaceSchema>;
