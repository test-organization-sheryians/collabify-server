import { z } from "zod";

export const createChannelSchema = z.object({
  workspaceId: z.string().cuid(),
  projectId: z.string().cuid().optional(),
  name: z.string().trim().min(1, "Name is required").max(100).optional(),
  topic: z.string().trim().max(500).optional(),
  type: z.enum(["PUBLIC", "PRIVATE", "DM"]).default("PUBLIC"),
  memberUserIds: z.array(z.string().cuid()).optional(),
});
