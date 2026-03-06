/**
 * createVaultFolder — Service Handler
 *
 * Creates a user-defined folder at root or inside a parent folder.
 * System folders cannot be used as parent targets.
 *
 * Steps:
 *   1. validateParent  — verify parent folder exists + is not a system folder [conditional]
 *   2. createFolderRecord — insert VaultFolder row
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { CreateVaultFolderInput } from "./schema";
import { validateParent } from "./steps/validate-parent";
import { createFolderRecord } from "./steps/create-folder-record";

const logger = createLogger("vault:services:create-folder");

export const createVaultFolderHandler = async (
  input: CreateVaultFolderInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    if (input.parentFolderId) {
      await validateParent(input.parentFolderId, input.projectId, ctx.db);
    }

    const folder = await createFolderRecord(
      input.projectId,
      input.name,
      input.parentFolderId,
      ctx.db
    );

    logger.info("Vault folder created", {
      folderId: folder.id,
      projectId: input.projectId,
      userId,
    });

    return { folder };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to create vault folder", {
      err: error,
      userId,
      projectId: input.projectId,
    });
    throw new AppError("Failed to create folder");
  }
};
