import { z } from "zod";

export const sendMessageSchema = z.object({
  conversationId: z.string().min(1),
  conversationType: z.enum(["CHANNEL", "DM", "GROUP_DM", "THREAD"]).optional(),
  content: z.string().min(1).max(4000),
  dedupeId: z.string().uuid(), // Client-generated UUID for idempotency
  parentMessageId: z.string().uuid().optional(), // For inline replies (message-reference)
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
