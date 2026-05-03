import { z } from "zod";

export const GetProjectOverviewSchema = z.object({
  projectId: z.string().cuid(),
});

export type GetProjectOverviewInput = z.infer<typeof GetProjectOverviewSchema>;
