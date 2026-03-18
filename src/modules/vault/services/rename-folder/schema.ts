import { z } from "zod";

export const renameVaultFolderSchema = z.object({
  folderId: z.string().cuid(),
  name: z.string().min(1).max(255),
});

export type RenameVaultFolderInput = z.infer<typeof renameVaultFolderSchema>;
