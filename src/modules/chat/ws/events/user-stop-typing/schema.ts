import { z } from "zod";

export const userStopTypingSchema = z.object({
  channelId: z.string().min(1),
});

export type UserStopTypingInput = z.infer<typeof userStopTypingSchema>;
