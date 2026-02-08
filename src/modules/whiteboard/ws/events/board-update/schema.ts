import { z } from "zod";

export const boardUpdateSchema = z.object({
  boardId: z.string().min(1),
  update: z.string(), // Base64-encoded Y.Doc update binary
  dedupeId: z.string().uuid(), // Client-side deduplication ID
});

export type BoardUpdateInput = z.infer<typeof boardUpdateSchema>;
