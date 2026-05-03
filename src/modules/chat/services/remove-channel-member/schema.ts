import { z } from "zod";

export const removeChannelMemberSchema = z.object({
  workspaceId: z.string().cuid(),
  channelId: z.string().cuid(),
  userId: z.string(), // Single user constraint elevated securely
});
  