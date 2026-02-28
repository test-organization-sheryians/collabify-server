import { z } from "zod";
import { RESERVED_SLUGS } from "@/shared/config/limits";

const SLUG_REGEX = /^(?![0-9]+$)[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const CheckAvailabilitySchema = z.object({
  slug: z
    .string()
    .min(8)
    .max(50)
    .regex(SLUG_REGEX, "Invalid slug format")
    .refine(
      (val: string) => !(RESERVED_SLUGS as readonly string[]).includes(val),
      {
        message: "Reserved slug",
      }
    ),
  userId: z.string(),
});
