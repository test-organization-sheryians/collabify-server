import { z } from "zod";
import {
  MIN_SLUG_LENGTH,
  MAX_SLUG_LENGTH,
} from "@/shared/utils/slug.config";

export const GetWorkspaceBySlugSchema = z.object({
  userId: z.string().min(1),
  slug: z
    .string()
    .min(MIN_SLUG_LENGTH, `Slug must be at least ${MIN_SLUG_LENGTH} characters`)
    .max(MAX_SLUG_LENGTH),
});
