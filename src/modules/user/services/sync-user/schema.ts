import { z } from "zod";

export const SyncUserSchema = z.object({
  clerkId: z.string().min(1, "Clerk ID is required"),
  email: z.string().email("Invalid email format"),
  fullName: z
    .string()
    .regex(/^[^<>]*$/, "HTML tags are not allowed in names")
    .nullable()
    .optional(),
  avatarUrl: z
    .string()
    .url("Invalid avatar URL")
    .startsWith("https://", "Avatar URL must use HTTPS")
    .nullable()
    .optional(),
  emailVerified: z.boolean().default(false), // Defaults to false for safety if missing
});
