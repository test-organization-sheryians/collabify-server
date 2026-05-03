import type { VaultFolder } from "@prisma/client";

export interface VaultSidebarResult {
  pinnedFolders: VaultFolder[];
  systemFolders: VaultFolder[];
}
