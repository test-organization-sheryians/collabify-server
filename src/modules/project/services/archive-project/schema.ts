import { z } from "zod";

export const ArchiveProjectSchema = z.object({
  projectId: z.string(),
  actorUserId: z.string(),
});

export type ArchiveProjectInput = z.infer<typeof ArchiveProjectSchema>;
