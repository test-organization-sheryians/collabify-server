import { z } from "zod";

export const moveVaultFileSchema = z.object({
  fileId: z.string().cuid(),
  /** null = move to root (Home) */
  targetFolderId: z.string().cuid().nullable().optional(),
});

export type MoveVaultFileInput = z.infer<typeof moveVaultFileSchema>;
