import { z } from "zod";

export const LeaveWorkspaceSchema = z.object({
  workspaceId: z.string(),
  actorUserId: z.string(),
});

export type LeaveWorkspaceInput = z.infer<typeof LeaveWorkspaceSchema>;
