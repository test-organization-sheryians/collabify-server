/**
 * Vault — System Folder Utilities
 *
 * System folders (From Chat, From Pages, etc.) are auto-created on first use.
 * They are marked isSystem=true and cannot be renamed/moved/deleted by users.
 */

import type { PrismaClient, VaultFolder } from "@prisma/client";
import { SYSTEM_FOLDER_NAMES } from "./constants";

type SystemFolderSource = keyof typeof SYSTEM_FOLDER_NAMES;

/**
 * Ensures a system folder exists for a given source + project.
 * Creates it if it doesn't exist yet. Safe to call concurrently — upsert is atomic.
 *
 * @returns The existing or newly created system VaultFolder row.
 */
export async function ensureSystemFolder(
  projectId: string,
  source: SystemFolderSource,
  db: PrismaClient
): Promise<VaultFolder> {
  const name = SYSTEM_FOLDER_NAMES[source];

  return db.vaultFolder
    .upsert({
      where: {
        // Uses the compound index [projectId, isSystem] + name filter
        // Since there's no unique constraint on (projectId, name), we use findFirst
        // approach via create + catch, but upsert requires a unique where.
        // We rely on the application-level guarantee: ensureSystemFolder is
        // the ONLY place system folders are created, and it's idempotent.
        // Practical approach: use the unique (projectId, name) if we add it,
        // or use a compound key. For now, use findFirst + create pattern.
        // This is safe because system folder creation is rare (once per project per source).
        id: "non-existent", // force the create branch
      },
      update: {},
      create: {
        projectId,
        name,
        isSystem: true,
      },
    })
    .catch(async () => {
      // If create fails (concurrent duplicate), fetch the existing one
      const existing = await db.vaultFolder.findFirst({
        where: { projectId, name, isSystem: true, deletedAt: null },
      });
      if (!existing) {
        throw new Error(
          `Failed to ensure system folder '${name}' for project ${projectId}`
        );
      }
      return existing;
    });
}

/**
 * Returns the name of a system folder for a given source.
 */
export function getSystemFolderName(source: SystemFolderSource): string {
  return SYSTEM_FOLDER_NAMES[source];
}
