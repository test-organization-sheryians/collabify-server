/**
 * moveVaultFolder — Service Handler
 *
 * Moves a folder to a new parent (or to root when targetParentFolderId = null).
 * System folders cannot be moved. Circular moves are rejected.
 *
 * Steps:
 *   1. fetchFolder          — verify folder exists + is not a system folder
 *   2. validateMoveTarget   — guard against moving into self or own descendant
 *   3. updateFolderParent   — set parentFolderId on VaultFolder row
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { MoveVaultFolderInput } from "./schema";
import { fetchFolder } from "./steps/fetch-folder";
import { validateMoveTarget } from "./steps/validate-target";
import { updateFolderParent } from "./steps/update-parent";

const logger = createLogger("vault:services:move-folder");

export const moveVaultFolderHandler = async (
  input: MoveVaultFolderInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  try {
    const folder = await fetchFolder(input.folderId, ctx.db);
    const proj = await ctx.authGate.getProject(folder.projectId);
    const scope = {
      type: "project" as const,
      id: folder.projectId,
      workspaceId: proj?.workspaceId ?? "",
    };
    await Promise.all([
      ctx.authGate.assertProjectMember(folder.projectId),
      ctx.permissions.assert("vault:folder:rename", scope),
    ]);
    await validateMoveTarget(
      input.folderId,
      input.targetParentFolderId,
      ctx.db
    );
    const updatedFolder = await updateFolderParent(
      input.folderId,
      input.targetParentFolderId,
      ctx.db
    );

    logger.info("Vault folder moved", {
      folderId: input.folderId,
      targetParentFolderId: input.targetParentFolderId,
      userId,
    });

    return { folder: updatedFolder };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to move vault folder", {
      err: error,
      userId,
      folderId: input.folderId,
    });
    throw new AppError("Failed to move folder");
  }
};
