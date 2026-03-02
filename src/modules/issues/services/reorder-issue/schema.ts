import { z } from "zod";

export const reorderIssueSchema = z.object({
  issueId: z.string().cuid(),
  newPosition: z.number(),
});

export type ReorderIssueInput = z.infer<typeof reorderIssueSchema>;
