import { z } from "zod";

export const syncReactionsSchema = z.object({
  conversationId: z.string().min(1),
  lastEventId: z.string().default("0-0"),
});

export type SyncReactionsInput = z.infer<typeof syncReactionsSchema>;
