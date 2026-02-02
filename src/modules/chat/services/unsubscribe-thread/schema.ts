import { z } from "zod";

export const unsubscribeThreadSchema = z.object({
  threadId: z.string().cuid(),
});
