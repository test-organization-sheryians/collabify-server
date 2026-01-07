import { z } from "zod";
import { RESERVED_SLUGS } from "../../shared/config/limits";

// Regex: Starts with alphanumeric, contains only alphanumeric & dashes, cannot be purely numeric
const SLUG_REGEX = /^(?![0-9]+$)[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const CreateWorkspaceSchema = z.object({
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
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

export const UserIdSchema = z.object({
  userId: z.string().min(1),
});

export const CheckAvailabilitySchema = z.object({
  slug: z
    .string()
    .min(3)
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

export const CreateOnboardingWorkspaceSchema = z.object({
  userId: z.string().min(1),
  userFullName: z.string(),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(SLUG_REGEX, "Invalid slug format")
    .optional(),
});

export const WorkspaceBySlugSchema = z.object({
  userId: z.string().min(1),
  slug: z.string().min(1),
});

export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;
