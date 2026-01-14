import { z } from "zod";
import { RESERVED_SLUGS } from "../../shared/config/limits";

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

export const UserIdSchema = z.object({
  userId: z.string().min(1),
});

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

export const WorkspaceBySlugSchema = z.object({
  userId: z.string().min(1),
  slug: z.string().min(8),
});

export const InviteToWorkspaceSchema = z.object({
  workspaceId: z.string().min(1),
  emails: z
    .array(z.string().email().toLowerCase())
    .min(1)
    .max(10, "Cannot invite more than 10 users at once"),
  actorUserId: z.string().min(1),
});

export const AcceptInviteSchema = z.object({
  token: z.string().min(1),
  userId: z.string().min(1),
  userEmail: z.string().email().toLowerCase(), // Crucial for verification
});

export const GetInviteInfoSchema = z.object({
  token: z.string().min(1),
  userId: z.string().optional(), // Can be anonymous
  userEmail: z.string().email().optional(), // For checking match
});

export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;
