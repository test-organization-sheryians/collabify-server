import { z } from "zod";

export const removeChannelMemberSchema = z.object({
  workspaceId: z.string().cuid(),
  channelId: z.string().cuid(),
  userId: z.string().min(1), // Single user

});
