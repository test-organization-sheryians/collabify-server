/**
 * Vault — System Folder Utilities
 *
 * System folders (From Chat, From Pages, etc.) are auto-created on first use.
 * They are marked isSystem=true and cannot be renamed/moved/deleted by users.
 *
 * Each (projectId, name) pair is unique at the DB level (partial unique index
 * on non-deleted rows — see migration add_vault_folder_unique_project_name).
 */

import type { PrismaClient, VaultFolder } from "@prisma/client";
import { SYSTEM_FOLDER_NAMES } from "./constants";

type SystemFolderSource = keyof typeof SYSTEM_FOLDER_NAMES;

/**
 * Ensures a system folder exists for a given source + project.
 *
 * Uses a findFirst-then-create pattern (not upsert) because the unique
 * constraint is a partial index (WHERE deleted_at IS NULL) which Prisma's
 * upsert cannot target directly.
 *
 * Concurrency: two simultaneous creates for the same (projectId, name) will
 * cause the second to hit the unique index violation → caught → falls back to
 * findFirst(). Safe under high concurrency.
 *
 * @returns The existing or newly created system VaultFolder row.
 */
export async function ensureSystemFolder(
  projectId: string,
  source: SystemFolderSource,
  db: PrismaClient
): Promise<VaultFolder> {
  const name = SYSTEM_FOLDER_NAMES[source];

  // 1. Happy path — folder already exists (most calls end here)
  const existing = await db.vaultFolder.findFirst({
    where: { projectId, name, isSystem: true, deletedAt: null },
  });
  if (existing) return existing;

  // 2. First use for this project+source — create it
  try {
    return await db.vaultFolder.create({
      data: { projectId, name, isSystem: true },
    });
  } catch {
    // 3. Concurrent create race — another request won the race.
    //    Re-fetch the winner.
    const winner = await db.vaultFolder.findFirst({
      where: { projectId, name, isSystem: true, deletedAt: null },
    });
    if (!winner) {
      throw new Error(
        `Failed to ensure system folder '${name}' for project ${projectId}`
      );
    }
    return winner;
  }
}

/**
 * Returns the name of a system folder for a given source.
 */
export function getSystemFolderName(source: SystemFolderSource): string {
  return SYSTEM_FOLDER_NAMES[source];
}
