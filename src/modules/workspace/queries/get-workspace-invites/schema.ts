import { z } from "zod";

export const GetWorkspaceInvitesSchema = z.object({
  workspaceId: z.string(),
  actorUserId: z.string(),
});

export type GetWorkspaceInvitesInput = z.infer<
  typeof GetWorkspaceInvitesSchema
>;
