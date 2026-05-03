import { z } from "zod";

export const GetProjectEntitiesSchema = z.object({
  projectId: z.string(),
  actorUserId: z.string(),
});

export type GetProjectEntitiesInput = z.infer<typeof GetProjectEntitiesSchema>;
