import { z } from "zod";

export const DeclineWorkspaceInviteSchema = z.object({
  token: z.string().min(1),
});
