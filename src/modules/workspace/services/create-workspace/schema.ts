import { z } from "zod";
import { RESERVED_SLUGS } from "@/shared/config/limits";
import {
  MIN_SLUG_LENGTH,
  MAX_SLUG_LENGTH,
  SLUG_REGEX,
} from "@/shared/utils/slug.config";

export const CreateWorkspaceSchema = z.object({
  slug: z
    .string()
    .min(MIN_SLUG_LENGTH, `Slug must be at least ${MIN_SLUG_LENGTH} characters`)
    .max(MAX_SLUG_LENGTH, `Slug must be at most ${MAX_SLUG_LENGTH} characters`)
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
