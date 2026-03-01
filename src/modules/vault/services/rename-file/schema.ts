import { z } from "zod";

export const renameVaultFileSchema = z.object({
  fileId: z.string().cuid(),
  name: z.string().min(1).max(500),
});

export type RenameVaultFileInput = z.infer<typeof renameVaultFileSchema>;
