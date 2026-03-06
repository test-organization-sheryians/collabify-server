import { z } from "zod";

export const GetProjectMembersSchema = z.object({
  projectId: z.string(),
  actorUserId: z.string(),
});

export type GetProjectMembersInput = z.infer<typeof GetProjectMembersSchema>;
