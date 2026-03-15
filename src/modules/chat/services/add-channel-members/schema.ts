import { z } from "zod";

export const addChannelMembersSchema = z.object({
  workspaceId: z.string().cuid(),
  channelId: z.string().cuid(),
  userIds: z.array(z.string().min(1)).min(1).max(50), // Bulk: 1-50 users

});
