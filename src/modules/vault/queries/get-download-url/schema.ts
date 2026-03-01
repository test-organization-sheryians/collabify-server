import { z } from "zod";

export const getVaultDownloadUrlSchema = z.object({
  fileId: z.string().cuid(),
});

export type GetVaultDownloadUrlInput = z.infer<
  typeof getVaultDownloadUrlSchema
>;
