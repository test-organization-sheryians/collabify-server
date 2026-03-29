import { z } from "zod";

export const getProjectDmsSchema = z.object({
  projectId: z.string().cuid(),
  workspaceId: z.string().cuid(),
});

export type GetProjectDmsInput = z.infer<typeof getProjectDmsSchema>;
