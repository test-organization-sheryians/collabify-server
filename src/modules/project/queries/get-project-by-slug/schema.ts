import { z } from "zod";
import { SLUG_REGEX, MAX_SLUG_LENGTH } from "@/shared/utils/slug.config";

export const GetProjectBySlugSchema = z.object({
  workspaceId: z.string().cuid("Invalid Workspace ID"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(MAX_SLUG_LENGTH)
    .regex(SLUG_REGEX, "Slug must be lowercase alphanumeric with hyphens"),
  userId: z.string().min(1, "Invalid User ID"),
});
