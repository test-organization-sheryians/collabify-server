import { z } from "zod";

/**
 * Input Schema for creating a project.
 * Adheres to strict mode to prevent unknown fields.
 */
export const CreateProjectSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(50, "Name must be less than 50 characters"),
    slug: z
      .string()
      .transform((val) => val.toUpperCase()) // Auto-uppercase before regex check
      .pipe(
        z
          .string()
          .regex(
            /^[A-Z0-9-_]+$/,
            "Slug must consist of uppercase letters, numbers, hyphens, or underscores"
          )
      )
      .optional(),
    description: z
      .string()
      .max(500, "Description must be less than 500 characters")
      .optional(),
  })
  .strict();

export interface CheckSlugAvailabilityInput {
  workspaceId: string;
  slug: string;
  userId: string;
}

export const CheckSlugAvailabilitySchema = z.object({
  workspaceId: z.string().cuid(),
  slug: z.string().min(1),
  userId: z.string().cuid(),
});

export interface AvailabilityResponse {
  available: boolean;
  message?: string;
  reason?: string;
  reservationId?: string;
}

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
