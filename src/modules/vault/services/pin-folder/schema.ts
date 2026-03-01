import { z } from "zod";

export const pinVaultFolderSchema = z.object({
  projectId: z.string().cuid(),
  folderId: z.string().cuid(),
});

export type PinVaultFolderInput = z.infer<typeof pinVaultFolderSchema>;
