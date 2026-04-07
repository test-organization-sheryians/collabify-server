import { z } from "zod";

export const ProjectContributorStatsSchema = z.object({
  projectId: z.string().cuid(),
});

export type ProjectContributorStatsInput = z.infer<typeof ProjectContributorStatsSchema>;
