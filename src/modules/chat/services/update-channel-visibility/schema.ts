import { z } from "zod";

export const updateChannelVisibilitySchema = z.object({
  workspaceId: z.string().cuid(),
  channelId: z.string().cuid(),
  isPublic: z.boolean(),
});
