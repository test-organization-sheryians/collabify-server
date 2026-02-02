import { z } from "zod";
import { removeGroupMemberSchema } from "./schema";

export type RemoveGroupMemberInput = z.infer<typeof removeGroupMemberSchema>;

export type RemoveGroupMemberOutput = {
  success: boolean;
  groupId: string;
  userId: string;
};
