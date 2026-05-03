import { z } from "zod";
import {
  MIN_SLUG_LENGTH,
  MAX_SLUG_LENGTH,
  SLUG_REGEX,
} from "@/shared/utils/slug.config";

// Regex: Starts with alphanumeric, contains only alphanumeric & dashes, cannot be purely numeric

export const CreateOnboardingWorkspaceSchema = z.object({
  userId: z.string().min(1),
  userFullName: z.string(),
  slug: z
    .string()
    .min(MIN_SLUG_LENGTH, `Slug must be at least ${MIN_SLUG_LENGTH} characters`)
    .max(MAX_SLUG_LENGTH, `Slug must be at most ${MAX_SLUG_LENGTH} characters`)
    .regex(SLUG_REGEX, "Invalid slug format")
    .optional(),
});
