import { z } from "zod";

export const getVaultAncestorsSchema = z.object({
  folderId: z.string().cuid(),
});

export type GetVaultAncestorsInput = z.infer<typeof getVaultAncestorsSchema>;
