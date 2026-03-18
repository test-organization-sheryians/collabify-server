import { z } from "zod";

export const moveIssueStatusSchema = z.object({
  issueId: z.string().cuid(),
  statusId: z.string().cuid(),
  newPosition: z.number().optional(),
});

export type MoveIssueStatusInput = z.infer<typeof moveIssueStatusSchema>;
