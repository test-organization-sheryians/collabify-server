import { z } from "zod";

export const deleteMessageSchema = z.object({
  messageId: z.string().min(1),
  nonce: z.string().uuid(), // Client-generated UUID for idempotency
});

export type DeleteMessageInput = z.infer<typeof deleteMessageSchema>;
