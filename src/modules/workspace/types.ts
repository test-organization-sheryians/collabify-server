import { z } from "zod";

export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
});

export const UserIdSchema = z.object({
  userId: z.string().min(1),
});

export const CreateOnboardingWorkspaceSchema = z.object({
  userId: z.string().min(1),
  userFullName: z.string(),
});

export const WorkspaceBySlugSchema = z.object({
  userId: z.string().min(1),
  slug: z.string().min(1),
});

export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;
