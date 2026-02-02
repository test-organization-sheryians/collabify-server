import { z } from "zod";

export const typingStopSchema = z.object({
  conversationId: z.string().min(1, "conversationId is required"),
  nonce: z.string().optional(),
});

export type TypingStopInput = z.infer<typeof typingStopSchema>;
