import { z } from "zod";

export const getIssueStatusesSchema = z.object({
  projectId: z.string().cuid(),
});

export type GetIssueStatusesInput = z.infer<typeof getIssueStatusesSchema>;
