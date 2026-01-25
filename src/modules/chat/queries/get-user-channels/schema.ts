import { z } from "zod";

export const getUserChannelsSchema = z.object({
  workspaceId: z.string().cuid("Invalid workspace ID format"),
  projectId: z.string().cuid("Invalid project ID format"),
  limit: z
    .number()
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .default(50),
  offset: z.number().min(0, "Offset cannot be negative").default(0),
});

export type GetUserChannelsInput = z.infer<typeof getUserChannelsSchema>;
