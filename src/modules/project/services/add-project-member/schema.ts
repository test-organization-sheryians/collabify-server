import { z } from "zod";

export const AddProjectMemberSchema = z.object({
  projectId: z.string(),
  workspaceId: z.string(),
  actorUserId: z.string(),
  targetUserId: z.string(),
  roleId: z.string(), // project role to assign; workspace GUEST ceiling enforced at service layer
});

export type AddProjectMemberInput = z.infer<typeof AddProjectMemberSchema>;
