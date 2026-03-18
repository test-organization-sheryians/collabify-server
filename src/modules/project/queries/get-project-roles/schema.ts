import { z } from "zod";

export const GetProjectRolesSchema = z.object({
  projectId: z.string().cuid(),
  workspaceId: z.string().cuid(),
  actorUserId: z.string().min(1),
});

export type GetProjectRolesInput = z.infer<typeof GetProjectRolesSchema>;
