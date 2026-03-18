import { z } from "zod";

export const removeGroupMemberSchema = z.object({
  workspaceId: z.string().cuid(),
  groupId: z.string().cuid(),
  userId: z.string().min(1),

});
