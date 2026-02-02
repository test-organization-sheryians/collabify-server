import { z } from "zod";

export const addGroupMembersSchema = z.object({
  workspaceId: z.string().cuid(),
  groupId: z.string().cuid(),
  userIds: z.array(z.string().cuid()).min(1).max(50), // Bulk: 1-50 users
});
