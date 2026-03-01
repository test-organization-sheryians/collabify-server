import type { VaultFolder } from "@prisma/client";

/** VaultFolder row returned by fetchFolder (guards against system folders). */
export type FolderForDelete = VaultFolder;

/** Handler return type. */
export interface DeleteFolderResult {
  success: true;
  id: string;
}
