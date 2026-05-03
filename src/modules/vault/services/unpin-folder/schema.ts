import { z } from "zod";

export const unpinVaultFolderSchema = z.object({
  folderId: z.string().cuid(),
});

export type UnpinVaultFolderInput = z.infer<typeof unpinVaultFolderSchema>;
