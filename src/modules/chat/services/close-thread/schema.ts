import { z } from "zod";

export const closeThreadSchema = z.object({
  workspaceId: z.string().cuid(),
  threadId: z.string().cuid(),
});
