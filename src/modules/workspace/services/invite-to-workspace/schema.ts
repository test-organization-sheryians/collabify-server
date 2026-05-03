import { z } from "zod";

export const InviteToWorkspaceSchema = z.object({
  workspaceId: z.string().min(1),
  emails: z
    .array(z.string().email().toLowerCase())
    .min(1)
    .max(10, "Cannot invite more than 10 users at once"),
  actorUserId: z.string().min(1),
  roleId: z.string().min(1), // Role FK — which workspace role to assign on accept
});
