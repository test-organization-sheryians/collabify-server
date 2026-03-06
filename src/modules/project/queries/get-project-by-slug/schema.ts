import { z } from "zod";

export const GetProjectBySlugSchema = z.object({
  workspaceId: z.string().cuid("Invalid Workspace ID"),
  slug: z.string().min(1, "Slug is required"),
  userId: z.string().min(1, "Invalid User ID"),
});
