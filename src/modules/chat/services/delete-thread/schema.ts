import { z } from "zod";

export const deleteThreadSchema = z.object({
  workspaceId: z.string().cuid(),
  threadId: z.string().cuid(),
});
