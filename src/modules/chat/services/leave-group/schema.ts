import { z } from "zod";

export const leaveGroupSchema = z.object({
  workspaceId: z.string().cuid(),
  groupId: z.string().cuid(),
});
