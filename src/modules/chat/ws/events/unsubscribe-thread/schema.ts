import { z } from "zod";

export const unsubscribeThreadSchema = z.object({
  threadId: z.string().uuid(),
});

export type UnsubscribeThreadInput = z.infer<typeof unsubscribeThreadSchema>;
