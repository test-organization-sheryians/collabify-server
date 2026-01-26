import { z } from "zod";

export const deleteMessageSchema = z.object({
  messageId: z.string(),
  channelId: z.string().min(1),
});

export type DeleteMessageInput = z.infer<typeof deleteMessageSchema>;
