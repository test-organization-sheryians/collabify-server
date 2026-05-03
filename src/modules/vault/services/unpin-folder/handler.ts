/**
 * unpinVaultFolder — Service Handler
 *
 * Removes a folder from the user's sidebar pinned list. Idempotent.
 *
 * Steps:
 *   1. deletePin — delete VaultPinnedFolder row for this user + folder
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { UnpinVaultFolderInput } from "./schema";
import { deletePin } from "./steps/delete-pin";

const logger = createLogger("vault:services:unpin-folder");

export const unpinVaultFolderHandler = async (
  input: UnpinVaultFolderInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  try {
    // Step 0 — look up projectId from folder, then assert project member
    const folder = await ctx.db.vaultFolder.findFirst({
      where: { id: input.folderId },
      select: { projectId: true },
    });
    if (folder) {
      const proj = await ctx.authGate.getProject(folder.projectId);
      const scope = {
        type: "project" as const,
        id: folder.projectId,
        workspaceId: proj?.workspaceId ?? "",
      };
      await ctx.authGate.assertProjectMember(folder.projectId);
      await ctx.permissions.assert("vault:folder:create", scope);
    }

    await deletePin(userId, input.folderId, ctx.db);

    logger.info("Vault folder unpinned", {
      folderId: input.folderId,
      userId,
    });

    return { success: true, id: input.folderId };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to unpin vault folder", {
      err: error,
      userId,
      folderId: input.folderId,
    });
    throw new AppError("Failed to unpin folder");
  }
};
