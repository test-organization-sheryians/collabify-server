import { z } from "zod";

export const renameGroupSchema = z.object({
  workspaceId: z.string().cuid(),
  groupId: z.string().cuid(),
  name: z.string().min(1).max(80),
});
