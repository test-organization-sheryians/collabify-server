import { z } from "zod";
import { RoleType } from "@prisma/client";

export const UpdateMemberRoleSchema = z.object({
  workspaceId: z.string(),
  memberId: z.string(),
  role: z.nativeEnum(RoleType),
  actorUserId: z.string(),
});
