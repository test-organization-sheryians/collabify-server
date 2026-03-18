import type { VaultFile } from "@prisma/client";

/** Active VaultFile row returned by fetchActiveFileForEdit. */
export type ActiveFileRow = VaultFile;

/** Moved VaultFile row returned by updateFileFolder. */
export type MovedFileRow = VaultFile;

/** Handler return type. */
export interface MoveFileResult {
  file: MovedFileRow;
}
