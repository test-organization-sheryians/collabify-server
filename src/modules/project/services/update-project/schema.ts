import { z } from "zod";

export const UpdateProjectSchema = z.object({
  projectId: z.string(),
  actorUserId: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
  isPrivate: z.boolean().optional(),
});

export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
