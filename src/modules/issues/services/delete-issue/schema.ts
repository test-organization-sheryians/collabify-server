import { z } from "zod";

export const deleteIssueSchema = z.object({
  issueId: z.string().cuid(),
});

export type DeleteIssueInput = z.infer<typeof deleteIssueSchema>;
