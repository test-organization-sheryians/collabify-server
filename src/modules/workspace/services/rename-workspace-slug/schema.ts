import { z } from "zod";
import { RESERVED_SLUGS } from "@/shared/config/limits";
import {
  MIN_SLUG_LENGTH,
  MAX_SLUG_LENGTH,
  SLUG_REGEX,
} from "@/shared/utils/slug.config";

export const RenameWorkspaceSlugSchema = z.object({
  workspaceId: z.string().cuid(),
  actorUserId: z.string().min(1),
  slug: z
    .string()
    .min(MIN_SLUG_LENGTH, `Slug must be at least ${MIN_SLUG_LENGTH} characters`)
    .max(MAX_SLUG_LENGTH, `Slug must be at most ${MAX_SLUG_LENGTH} characters`)
    .regex(SLUG_REGEX, "Invalid slug format")
    .refine(
      (val) => !(RESERVED_SLUGS as readonly string[]).includes(val),
      { message: "Reserved slug" }
    ),
});

export type RenameWorkspaceSlugInput = z.infer<typeof RenameWorkspaceSlugSchema>;
