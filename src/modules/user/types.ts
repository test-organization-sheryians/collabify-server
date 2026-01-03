import { z } from "zod";

export const SyncUserSchema = z.object({
  clerkId: z.string().min(1, "Clerk ID is required"),
  email: z.string().email("Invalid email format"),
  fullName: z.string().optional(),
  avatarUrl: z.string().url("Invalid avatar URL").optional(),
});

export type SyncUserInput = z.infer<typeof SyncUserSchema>;
