import { z } from "zod";

export const createBoardSchema = z.object({
  workspaceId: z.string().cuid(),
  projectId: z.string().cuid().optional(),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(100, "Title must be less than 100 characters"),
  description: z
    .string()
    .trim()
    .max(500, "Description must be less than 500 characters")
    .optional(),
  // Optional: Add collaborators during board creation
  collaboratorIds: z
    .array(z.string().min(1, "User ID cannot be empty"))
    .max(50, "Cannot add more than 50 collaborators at once")
    .optional()
    .describe(
      "Optional array of user IDs to add as collaborators. Users must be workspace members."
    ),
});
