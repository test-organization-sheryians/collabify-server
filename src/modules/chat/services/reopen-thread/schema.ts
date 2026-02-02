import { z } from "zod";

export const reopenThreadSchema = z.object({
  workspaceId: z.string().cuid(),
  threadId: z.string().cuid(),
});
