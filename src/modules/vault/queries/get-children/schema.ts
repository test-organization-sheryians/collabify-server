import { z } from "zod";

export const getVaultChildrenSchema = z.object({
  projectId: z.string().cuid(),
  /** null = Home (root level — files/folders with no parent) */
  parentFolderId: z.string().cuid().nullable().optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(200).default(50),
  sortBy: z.enum(["NAME", "CREATED_AT", "SIZE", "TYPE"]).default("NAME"),
  sortDir: z.enum(["ASC", "DESC"]).default("ASC"),
});

export type GetVaultChildrenInput = z.infer<typeof getVaultChildrenSchema>;
