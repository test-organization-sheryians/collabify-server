import type { VaultFile } from "@prisma/client";

/** VaultFile row as returned by validatePendingFile (status=PENDING). */
export type PendingFileRow = VaultFile;

/** VaultFile row after activation (status=ACTIVE). */
export type ActiveFileRow = VaultFile;

/** Handler return type. */
export interface ConfirmUploadResult {
  file: ActiveFileRow;
}
