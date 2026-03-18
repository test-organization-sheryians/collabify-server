/**
 * pinVaultFolder — Service Handler
 *
 * Pins a folder to the user's sidebar. Idempotent — safe to call if already pinned.
 * Any folder (including system folders) can be pinned.
 *
 * Steps:
 *   1. fetchFolderForPin — verify folder exists in this project
 *   2. upsertPin         — create or refresh VaultPinnedFolder row
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { PinVaultFolderInput } from "./schema";
import { fetchFolderForPin } from "./steps/fetch-folder";
import { upsertPin } from "./steps/upsert-pin";

const logger = createLogger("vault:services:pin-folder");

export const pinVaultFolderHandler = async (
  input: PinVaultFolderInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  try {
    const proj = await ctx.authGate.getProject(input.projectId);
    const scope = {
      type: "project" as const,
      id: input.projectId,
      workspaceId: proj?.workspaceId ?? "",
    };
    await Promise.all([
      ctx.authGate.assertProjectMember(input.projectId),
      ctx.permissions.assert("vault.folder:read", scope),
    ]);
    const folder = await fetchFolderForPin(
      input.folderId,
      input.projectId,
      ctx.db
    );
    await upsertPin(userId, input.projectId, input.folderId, ctx.db);

    logger.info("Vault folder pinned", {
      folderId: input.folderId,
      userId,
    });

    return { folder };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to pin vault folder", {
      err: error,
      userId,
      folderId: input.folderId,
    });
    throw new AppError("Failed to pin folder");
  }
};
