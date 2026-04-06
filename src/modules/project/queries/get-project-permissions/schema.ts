import { z } from "zod";

export const GetProjectPermissionsSchema = z.object({
  workspaceId: z.string().cuid(),
  projectId: z.string().cuid(),
});

export type GetProjectPermissionsInput = z.infer<typeof GetProjectPermissionsSchema>;
