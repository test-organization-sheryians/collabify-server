import { z } from "zod";

export const subscribeThreadSchema = z.object({
  threadId: z.string().cuid(),
});
