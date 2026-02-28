import { z } from "zod";

export const removeReactionSchema = z.object({
  messageId: z.string().uuid(),
  emoji: z
    .string()
    .min(1)
    .max(10)
    .regex(/^[\p{Emoji}\p{Emoji_Component}]+$/u, "Invalid emoji format"),
});

export type RemoveReactionInput = z.infer<typeof removeReactionSchema>;
