/**
 * deleteVaultFolder — Service Handler
 *
 * Soft-deletes a folder and — when cascade=true — all descendant folders and files.
 * System folders cannot be deleted.
 *
 * Steps:
 *   1. fetchFolder         — verify folder exists + is not a system folder
 *   2. checkFolderEmpty    — 409 if folder has active children [cascade=false only]
 *   3. softDeleteRecursive — BFS soft-delete of all descendants + the folder itself
 *
 * ⚠️ Tech debt: softDeleteRecursive does not release UsageRecord.usedBytes.
 *    Usage records are reconciled by the background cleanup job.
 *    See: vault-system-design.md § 11.5
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { DeleteVaultFolderInput } from "./schema";
import { fetchFolder } from "./steps/fetch-folder";
import { checkFolderEmpty } from "./steps/check-empty";
import { softDeleteRecursive } from "./steps/soft-delete-recursive";

const logger = createLogger("vault:services:delete-folder");

export const deleteVaultFolderHandler = async (
  input: DeleteVaultFolderInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    await fetchFolder(input.folderId, ctx.db);

    if (!input.cascade) {
      await checkFolderEmpty(input.folderId, ctx.db);
    }

    await softDeleteRecursive(input.folderId, ctx.db);

    logger.info("Vault folder soft-deleted", {
      folderId: input.folderId,
      cascade: input.cascade,
      userId,
    });

    return { success: true, id: input.folderId };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to delete vault folder", {
      err: error,
      userId,
      folderId: input.folderId,
    });
    throw new AppError("Failed to delete folder");
  }
};
