import { z } from "zod";

export const userTypingSchema = z.object({
  channelId: z.string().uuid(),
});

export type UserTypingInput = z.infer<typeof userTypingSchema>;
