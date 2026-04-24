import { z } from "zod";
import { SLUG_REGEX, MAX_SLUG_LENGTH } from "@/shared/utils/slug.config";

export const CreateProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  slug: z
    .string()
    .regex(SLUG_REGEX, "Slug must be lowercase alphanumeric with hyphens")
    .max(MAX_SLUG_LENGTH, `Slug must be at most ${MAX_SLUG_LENGTH} characters`)
    .optional(),
  description: z.string().max(500, "Description too long").optional(),
});
