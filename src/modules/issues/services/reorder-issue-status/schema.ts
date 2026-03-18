import { z } from "zod";

export const reorderIssueStatusSchema = z.object({
  statusId: z.string().cuid(),
  newPosition: z.number(),
});

export type ReorderIssueStatusInput = z.infer<typeof reorderIssueStatusSchema>;
