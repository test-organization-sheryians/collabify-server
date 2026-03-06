import { z } from "zod";

export const UpdateWorkspaceSchema = z.object({
  workspaceId: z.string(),
  actorUserId: z.string(),
  name: z.string().min(1).max(100).optional(),
  logoUrl: z.string().url().nullable().optional(),
  domainWhitelist: z.string().nullable().optional(),
});

export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceSchema>;
