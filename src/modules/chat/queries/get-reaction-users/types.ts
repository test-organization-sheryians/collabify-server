import { z } from "zod";

export const getReactionUsersSchema = z.object({
  messageId: z.string().uuid(),
  emoji: z.string().min(1).max(10),
  cursor: z.number().int().nonnegative().optional().default(0),
});

export type GetReactionUsersInput = z.infer<typeof getReactionUsersSchema>;
