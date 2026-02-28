import { z } from "zod";

export const typingStartSchema = z.object({
  conversationId: z.string().min(1, "conversationId is required"),
  nonce: z.string().optional(), // For client-side ACK tracking
});

export type TypingStartInput = z.infer<typeof typingStartSchema>;
