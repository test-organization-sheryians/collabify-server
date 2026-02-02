import { z } from "zod";

export const updateChannelDescriptionSchema = z.object({
  workspaceId: z.string().cuid(),
  channelId: z.string().cuid(),
  description: z.string().min(0).max(500).optional(),
});
