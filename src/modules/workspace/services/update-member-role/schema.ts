import { z } from "zod";

export const UpdateMemberRoleSchema = z.object({
  workspaceId: z.string(),
  memberId: z.string(),
  roleId: z.string().min(1), // resolved as DB role ID
  actorUserId: z.string(),
});
