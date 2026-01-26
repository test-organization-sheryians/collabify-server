import { z } from "zod";

export const editMessageSchema = z.object({
  messageId: z.string(), // The stream ID or DB ID
  channelId: z.string().min(1),
  content: z.string().min(1).max(4000),
});

export type EditMessageInput = z.infer<typeof editMessageSchema>;
