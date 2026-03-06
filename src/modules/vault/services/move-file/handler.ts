/**
 * moveVaultFile — Service Handler
 *
 * Moves a file to a different folder (or to root when targetFolderId = null).
 * Files cannot be moved into system folders.
 *
 * Steps:
 *   1. fetchActiveFileForEdit    — verify file is ACTIVE + user has access
 *   2. validateTargetFolder      — target must be non-system + be in same project
 *   3. updateFileFolder          — set folderId on VaultFile row
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { MoveVaultFileInput } from "./schema";
import { fetchActiveFileForEdit } from "./steps/fetch-file";
import { validateTargetFolder } from "./steps/validate-target-folder";
import { updateFileFolder } from "./steps/update-folder";

const logger = createLogger("vault:services:move-file");

export const moveVaultFileHandler = async (
  input: MoveVaultFileInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    const file = await fetchActiveFileForEdit(input.fileId, userId, ctx.db);
    await validateTargetFolder(input.targetFolderId, file.projectId, ctx.db);
    const updated = await updateFileFolder(
      input.fileId,
      input.targetFolderId,
      ctx.db
    );

    logger.info("Vault file moved", {
      fileId: input.fileId,
      targetFolderId: input.targetFolderId,
      userId,
    });

    return { file: updated };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to move vault file", {
      err: error,
      userId,
      fileId: input.fileId,
    });
    throw new AppError("Failed to move file");
  }
};
