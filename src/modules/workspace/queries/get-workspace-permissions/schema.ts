import { z } from "zod";

export const GetWorkspacePermissionsSchema = z.object({
  workspaceId: z.string().cuid(),
});

export type GetWorkspacePermissionsInput = z.infer<typeof GetWorkspacePermissionsSchema>;
