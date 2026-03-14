import { z } from "zod";

export const GetWorkspaceOverviewSchema = z.object({
  workspaceId: z.string().cuid(),
});

export type GetWorkspaceOverviewInput = z.infer<typeof GetWorkspaceOverviewSchema>;
