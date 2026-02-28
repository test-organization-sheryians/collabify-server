import { z } from "zod";

export const createPageSchema = z.object({
  workspaceId: z.string().cuid(),
  projectId: z.string().cuid(),
  /** null = root-level page */
  parentId: z.string().cuid().nullable().optional(),
  title: z.string().min(1).max(500).default("Untitled"),
  icon: z.string().max(10).optional(),
  coverUrl: z.string().url().optional(),
  /** Fractional indexing value — must be finite */
  position: z.number().finite(),
  /** Additional collaborator userIds to add at creation time (besides the creator) */
  collaboratorIds: z.array(z.string()).optional(),
});

export type CreatePageInput = z.infer<typeof createPageSchema>;
