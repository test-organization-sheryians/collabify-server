import { z } from "zod";
export const reorderPageSchema = z.object({
  pageId: z.string().cuid(),
  /** New parent page ID. null = move to root. */
  newParentId: z.string().cuid().nullable().optional(),
  newPosition: z.number().finite(),
});
export type ReorderPageInput = z.infer<typeof reorderPageSchema>;
