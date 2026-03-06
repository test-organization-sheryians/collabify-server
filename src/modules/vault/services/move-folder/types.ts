import type { VaultFolder } from "@prisma/client";

/** VaultFolder row returned by fetchFolder. */
export type FolderRow = VaultFolder;

/** Moved VaultFolder row returned by updateFolderParent. */
export type MovedFolderRow = VaultFolder;

/** Handler return type. */
export interface MoveFolderResult {
  folder: MovedFolderRow;
}
