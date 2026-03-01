/**
 * renameVaultFolder — Service Handler
 *
 * Renames a user folder. System folders cannot be renamed.
 *
 * Steps:
 *   1. fetchEditableFolder — verify folder exists + is not a system folder
 *   2. updateFolderName   — set name on VaultFolder row
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { RenameVaultFolderInput } from "./schema";
import { fetchEditableFolder } from "./steps/fetch-folder";
import { updateFolderName } from "./steps/update-name";

const logger = createLogger("vault:services:rename-folder");

export const renameVaultFolderHandler = async (
  input: RenameVaultFolderInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    await fetchEditableFolder(input.folderId, ctx.db);
    const folder = await updateFolderName(input.folderId, input.name, ctx.db);

    logger.info("Vault folder renamed", {
      folderId: input.folderId,
      userId,
    });

    return { folder };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to rename vault folder", {
      err: error,
      userId,
      folderId: input.folderId,
    });
    throw new AppError("Failed to rename folder");
  }
};
