import { z } from "zod";

export const UpdateProjectSchema = z.object({
  projectId: z.string(),
  actorUserId: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
  isPrivate: z.boolean().optional(),
  logoS3Key: z.string().nullable().optional(),
  key: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[a-z0-9-]+$/, "Key must be lowercase letters, numbers, or hyphens only")
    .optional(),
});

export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
