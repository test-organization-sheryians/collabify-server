import { z } from "zod";

export const markReadSchema = z.object({
  channelId: z.string().min(1),
  messageId: z.string().min(1), // The ID of the message read
});

export type MarkReadInput = z.infer<typeof markReadSchema>;
