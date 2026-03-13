import { z } from "zod";

export const getMessageReactionsSchema = z.object({
  messageId: z.string().uuid(),
});

export type GetMessageReactionsInput = z.infer<typeof getMessageReactionsSchema>;
