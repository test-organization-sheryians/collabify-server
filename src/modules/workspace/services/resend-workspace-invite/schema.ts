import { z } from "zod";

export const ResendWorkspaceInviteSchema = z.object({
  inviteId: z.string(),
  workspaceId: z.string(),
  actorUserId: z.string(),
});

export type ResendWorkspaceInviteInput = z.infer<
  typeof ResendWorkspaceInviteSchema
>;
