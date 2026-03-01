import { z } from "zod";

export const confirmVaultUploadSchema = z.object({
  fileId: z.string().cuid(),
});

export type ConfirmVaultUploadInput = z.infer<typeof confirmVaultUploadSchema>;
