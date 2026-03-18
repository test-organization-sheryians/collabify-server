import { z } from "zod";

export const UnarchiveProjectSchema = z.object({
  projectId: z.string(),
  actorUserId: z.string(),
});

export type UnarchiveProjectInput = z.infer<typeof UnarchiveProjectSchema>;
