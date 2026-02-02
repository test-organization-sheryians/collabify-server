import { z } from "zod";
import { leaveGroupSchema } from "./schema";

export type LeaveGroupInput = z.infer<typeof leaveGroupSchema>;

export type LeaveGroupOutput = {
  success: boolean;
  groupId: string;
};
