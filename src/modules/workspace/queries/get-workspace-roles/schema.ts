import { z } from "zod";

export const GetWorkspaceRolesSchema = z.object({
  workspaceId: z.string().cuid(),
  actorUserId: z.string().min(1),

});

export type GetWorkspaceRolesInput = z.infer<typeof GetWorkspaceRolesSchema>;
