import { z } from "zod";

export const unsubscribeThreadSchema = z.object({
  threadId: z.string().min(1),
});

export type UnsubscribeThreadInput = z.infer<typeof unsubscribeThreadSchema>;
