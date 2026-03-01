import { z } from "zod";

export const requestVaultUploadSchema = z.object({
  projectId: z.string().cuid(),
  workspaceId: z.string().cuid(),
  /** null = upload to Home (root) */
  folderId: z.string().cuid().nullable().optional(),
  name: z.string().min(1).max(500),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});

export type RequestVaultUploadInput = z.infer<typeof requestVaultUploadSchema>;
