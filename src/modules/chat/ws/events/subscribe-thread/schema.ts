import { z } from "zod";

export const subscribeThreadSchema = z.object({
  threadId: z.string().uuid(), // The MessageID that is the root of the thread
});

export type SubscribeThreadInput = z.infer<typeof subscribeThreadSchema>;
