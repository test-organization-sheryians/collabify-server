import { z } from "zod";

export const selectionChangeSchema = z.object({
  boardId: z.string().min(1),
  elementIds: z.array(z.string()),
});

export type SelectionChangeInput = z.infer<typeof selectionChangeSchema>;
