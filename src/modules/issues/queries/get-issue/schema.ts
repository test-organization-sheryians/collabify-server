import { z } from "zod";

export const getIssueSchema = z.object({
  issueId: z.string().cuid(),
});

export type GetIssueInput = z.infer<typeof getIssueSchema>;
