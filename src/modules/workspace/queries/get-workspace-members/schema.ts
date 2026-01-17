import { z } from "zod";

export const GetWorkspaceMembersSchema = z.object({
  workspaceId: z.string().min(1, "Invalid Workspace ID"),
  actorUserId: z.string().min(1, "Invalid User ID"),
});
