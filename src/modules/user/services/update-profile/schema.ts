import { z } from "zod";

export const UpdateProfileSchema = z.object({
  userId: z.string(),
  fullName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
