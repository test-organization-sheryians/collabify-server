import { z } from "zod";

export const getIssueDescriptionUrlSchema = z.object({
  issueId: z.string().cuid(),
});

export type GetIssueDescriptionUrlInput = z.infer<
  typeof getIssueDescriptionUrlSchema
>;
