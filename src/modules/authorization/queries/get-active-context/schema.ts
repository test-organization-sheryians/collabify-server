import { z } from "zod";

export const GetActiveContextSchema = z.object({
  workspaceId: z.string().min(1),
  projectId: z.string().optional(),
  actorUserId: z.string().min(1),
});

export type GetActiveContextInput = z.infer<typeof GetActiveContextSchema>;
