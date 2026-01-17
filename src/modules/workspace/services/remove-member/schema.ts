import { z } from "zod";

export const RemoveMemberSchema = z.object({
  workspaceId: z.string(),
  memberId: z.string(),
  actorUserId: z.string(),
});
