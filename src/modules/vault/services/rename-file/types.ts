import type { VaultFile } from "@prisma/client";

/** Renamed VaultFile row returned by updateFileName. */
export type RenamedFileRow = VaultFile;

/** Handler return type. */
export interface RenameFileResult {
  file: RenamedFileRow;
}
