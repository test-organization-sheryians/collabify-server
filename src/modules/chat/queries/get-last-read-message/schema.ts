import { z } from "zod";

export const getLastReadMessageSchema = z.object({
  channelId: z.string().cuid(),
});

export type GetLastReadMessageInput = z.infer<typeof getLastReadMessageSchema>;
