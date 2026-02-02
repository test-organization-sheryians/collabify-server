import { z } from "zod";

export const addReactionSchema = z.object({
  messageId: z.string().uuid(),
  emoji: z
    .string()
    .min(1)
    .max(10)
    .regex(/^[\p{Emoji}\p{Emoji_Component}]+$/u, "Invalid emoji format"),
  tempId: z.string().uuid().optional(), // For optimistic UI
});

export type AddReactionInput = z.infer<typeof addReactionSchema>;
