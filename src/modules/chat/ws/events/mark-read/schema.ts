import { z } from "zod";

export const markReadSchema = z.object({
  channelId: z.string().uuid(),
  messageId: z.string(), // The ID of the message read
});

export type MarkReadInput = z.infer<typeof markReadSchema>;
