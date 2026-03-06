import { z } from "zod";

export const LeaveProjectSchema = z.object({
  projectId: z.string(),
  actorUserId: z.string(),
});

export type LeaveProjectInput = z.infer<typeof LeaveProjectSchema>;
