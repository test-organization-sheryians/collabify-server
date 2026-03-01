import { z } from "zod";

export const deleteVaultFileSchema = z.object({
  fileId: z.string().cuid(),
});

export type DeleteVaultFileInput = z.infer<typeof deleteVaultFileSchema>;
