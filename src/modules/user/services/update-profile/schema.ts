import { z } from "zod";

export const UpdateProfileSchema = z.object({
  userId: z.string(),
  fullName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
  timezone: z.string().max(64).optional(),
  language: z.string().max(10).optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
