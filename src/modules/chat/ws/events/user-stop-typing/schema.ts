import { z } from "zod";

export const userStopTypingSchema = z.object({
  channelId: z.string().uuid(),
});

export type UserStopTypingInput = z.infer<typeof userStopTypingSchema>;
