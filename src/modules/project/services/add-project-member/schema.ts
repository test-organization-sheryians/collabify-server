import { z } from "zod";

export const AddProjectMemberSchema = z.object({
  projectId: z.string(),
  workspaceId: z.string(),
  actorUserId: z.string(),
  targetUserId: z.string(),
});

export type AddProjectMemberInput = z.infer<typeof AddProjectMemberSchema>;
