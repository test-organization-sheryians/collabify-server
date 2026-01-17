import { z } from "zod";
import { RESERVED_SLUGS } from "@/shared/config/limits";

// Regex: Starts with alphanumeric, contains only alphanumeric & dashes, cannot be purely numeric
const SLUG_REGEX = /^(?![0-9]+$)[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const CreateWorkspaceSchema = z.object({
  slug: z
    .string()
    .min(8, "Slug must be at least 8 characters")
    .max(50, "Slug must be at most 50 characters")
    .regex(
      SLUG_REGEX,
      "Slug must be lowercase, alphanumeric, and cannot be purely numeric"
    )
    .refine(
      (val: string) => !(RESERVED_SLUGS as readonly string[]).includes(val),
      {
        message: "This slug is reserved for system use",
      }
    ),
  name: z.string().min(1).max(50),
  userId: z.string(),
});
