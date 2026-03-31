import { z } from "zod";

export const UpdateMemberRoleSchema = z.object({
  workspaceId: z.string(),
  memberId: z.string(),
  role: z.string().min(1), // role name validated against DB in updateRole step
  actorUserId: z.string(),
});
