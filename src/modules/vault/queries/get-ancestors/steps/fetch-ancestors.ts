import type { PrismaClient } from "@prisma/client";
import type { FolderRow } from "../types";

const MAX_DEPTH = 20; // safety guard — prevents infinite loops on corrupt data

/**
 * Walks the parentFolderId chain upward from folderId, collecting each folder.
 * Returns the chain ordered root → current (current folder is the last element).
 *
 * Strategy: iterative (not recursive) — avoids call-stack issues on deep trees.
 * Stops at MAX_DEPTH to protect against corrupt circular references.
 *
 * @layer Server — vault:queries:get-ancestors
 */
export async function fetchAncestors(
  folderId: string,
  db: PrismaClient
): Promise<FolderRow[]> {
  const chain: FolderRow[] = [];
  let currentId: string | null = folderId;
  let hops = 0;

  while (currentId && hops < MAX_DEPTH) {
    const folder: FolderRow | null = await db.vaultFolder.findFirst({
      where: { id: currentId, deletedAt: null },
    });

    if (!folder) break;

    chain.unshift(folder); // prepend → chain stays in root-first order
    currentId = folder.parentFolderId;
    hops++;
  }

  return chain;
}
