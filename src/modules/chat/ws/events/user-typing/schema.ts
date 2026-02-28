import { z } from "zod";

export const userTypingSchema = z.object({
  channelId: z.string().min(1),
});

export type UserTypingInput = z.infer<typeof userTypingSchema>;
