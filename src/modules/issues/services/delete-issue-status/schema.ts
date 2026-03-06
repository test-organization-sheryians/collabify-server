import { z } from "zod";

export const deleteIssueStatusSchema = z.object({
  statusId: z.string().cuid(),
});

export type DeleteIssueStatusInput = z.infer<typeof deleteIssueStatusSchema>;
