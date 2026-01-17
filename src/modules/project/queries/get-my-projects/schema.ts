import { z } from "zod";

export const GetMyProjectsSchema = z.object({
  workspaceId: z.string().cuid("Invalid Workspace ID"),
  userId: z.string().min(1, "Invalid User ID"),
});
