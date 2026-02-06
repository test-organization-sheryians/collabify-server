import { z } from "zod";

export const deleteGroupSchema = z.object({
  workspaceId: z.string().cuid(),
  groupId: z.string().cuid(),
});
