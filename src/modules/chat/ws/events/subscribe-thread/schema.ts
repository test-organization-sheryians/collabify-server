import { z } from "zod";

export const subscribeThreadSchema = z.object({
  threadId: z.string().min(1), // The MessageID that is the root of the thread
});

export type SubscribeThreadInput = z.infer<typeof subscribeThreadSchema>;
