import { z } from "zod";

export const RemoveProjectMemberSchema = z.object({
  projectId: z.string(),
  workspaceId: z.string(),
  actorUserId: z.string(),
  targetUserId: z.string(),
});

export type RemoveProjectMemberInput = z.infer<
  typeof RemoveProjectMemberSchema
>;
