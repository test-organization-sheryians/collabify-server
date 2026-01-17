import { z } from "zod";

// Regex: Starts with alphanumeric, contains only alphanumeric & dashes, cannot be purely numeric
const SLUG_REGEX = /^(?![0-9]+$)[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const CreateOnboardingWorkspaceSchema = z.object({
  userId: z.string().min(1),
  userFullName: z.string(),
  slug: z
    .string()
    .min(8)
    .max(50)
    .regex(SLUG_REGEX, "Invalid slug format")
    .optional(),
});
