import type { VaultFolder } from "@prisma/client";

/** VaultFolder row as returned by createFolderRecord. */
export type CreatedFolderRow = VaultFolder;

/** Handler return type. */
export interface CreateFolderResult {
  folder: CreatedFolderRow;
}
