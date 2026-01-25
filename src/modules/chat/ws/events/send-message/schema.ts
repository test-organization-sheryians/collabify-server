import { z } from "zod";

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(4000),
  dedupeId: z.string().uuid(), // Client-generated UUID for idempotency
  threadId: z.string().uuid().optional(), // Parent message ID if replying
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
