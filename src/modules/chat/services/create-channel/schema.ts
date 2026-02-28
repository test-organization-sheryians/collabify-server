import { z } from "zod";

export const createChannelSchema = z.object({
  workspaceId: z.string().cuid(),
  projectId: z.string().cuid().optional(),
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  topic: z
    .string()
    .trim()
    .max(500, "Topic must be less than 500 characters")
    .optional(),
  type: z.enum(["CHANNEL", "DM", "GROUP_DM"]).default("CHANNEL"),
  memberUserIds: z.array(z.string().cuid()).optional(),
});
