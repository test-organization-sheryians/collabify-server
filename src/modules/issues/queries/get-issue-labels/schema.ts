import { z } from "zod";

export const getIssueLabelsSchema = z.object({
  projectId: z.string().cuid(),
});

export type GetIssueLabelsInput = z.infer<typeof getIssueLabelsSchema>;
