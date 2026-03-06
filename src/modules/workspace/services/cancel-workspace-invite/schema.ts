import { z } from "zod";

export const CancelWorkspaceInviteSchema = z.object({
  inviteId: z.string(),
  workspaceId: z.string(),
  actorUserId: z.string(),
});

export type CancelWorkspaceInviteInput = z.infer<
  typeof CancelWorkspaceInviteSchema
>;
