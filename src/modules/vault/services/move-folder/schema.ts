import { z } from "zod";

export const moveVaultFolderSchema = z.object({
  folderId: z.string().cuid(),
  /** null = move to root level */
  targetParentFolderId: z.string().cuid().nullable().optional(),
});

export type MoveVaultFolderInput = z.infer<typeof moveVaultFolderSchema>;
