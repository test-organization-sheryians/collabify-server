import { z } from "zod";

export const createVaultFolderSchema = z.object({
  projectId: z.string().cuid(),
  /** null = create at root level */
  parentFolderId: z.string().cuid().nullable().optional(),
  name: z.string().min(1).max(255),
});

export type CreateVaultFolderInput = z.infer<typeof createVaultFolderSchema>;
