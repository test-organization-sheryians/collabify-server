import { z } from "zod";

export const deleteVaultFolderSchema = z.object({
  folderId: z.string().cuid(),
  /**
   * If true: recursively soft-delete all children.
   * If false (default): returns 409 if folder is non-empty.
   */
  cascade: z.boolean().default(false),
});

export type DeleteVaultFolderInput = z.infer<typeof deleteVaultFolderSchema>;
