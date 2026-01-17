import { z } from "zod";

export const GetWorkspaceBySlugSchema = z.object({
  userId: z.string().min(1),
  slug: z.string().min(8),
});
