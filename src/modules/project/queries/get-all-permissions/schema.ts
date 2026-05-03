import { z } from "zod";

export const GetAllPermissionsSchema = z.object({
  workspaceId: z.string().min(1),
});

export type GetAllPermissionsInput = z.infer<typeof GetAllPermissionsSchema>;
