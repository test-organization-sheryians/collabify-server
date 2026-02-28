import { z } from "zod";

export const editMessageSchema = z.object({
  messageId: z.string().min(1),
  content: z.string().min(1).max(4000),
  nonce: z.string().uuid(), // Client-generated UUID for idempotency
});

export type EditMessageInput = z.infer<typeof editMessageSchema>;
