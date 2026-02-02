import { z } from "zod";

export const markReadSchema = z.object({
  conversationId: z.string(),
  watermarkId: z.string(), // Watermark: All messages <= this are read
  nonce: z.string().uuid().optional(),
});

export type MarkReadInput = z.infer<typeof markReadSchema>;
