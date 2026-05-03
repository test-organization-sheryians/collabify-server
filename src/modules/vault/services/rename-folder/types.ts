import type { VaultFolder } from "@prisma/client";

/** Renamed VaultFolder row returned by updateFolderName. */
export type RenamedFolderRow = VaultFolder;

/** Handler return type. */
export interface RenameFolderResult {
  folder: RenamedFolderRow;
}
