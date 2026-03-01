import type { VaultFolder } from "@prisma/client";

/** VaultFolder row returned by fetchFolderForPin. */
export type PinnableFolderRow = VaultFolder;

/** Handler return type — the folder that was pinned. */
export interface PinFolderResult {
  folder: PinnableFolderRow;
}
