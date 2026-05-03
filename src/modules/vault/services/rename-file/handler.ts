/**
 * renameVaultFile — Service Handler
 *
 * Renames a file (metadata only — S3 key is unchanged).
 *
 * Steps:
 *   1. fetchActiveFileForEdit — verify file is ACTIVE + user has access
 *   2. updateFileName         — set name on VaultFile row
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { RenameVaultFileInput } from "./schema";
import { fetchActiveFileForEdit } from "./steps/fetch-file";
import { updateFileName } from "./steps/update-name";

const logger = createLogger("vault:services:rename-file");

export const renameVaultFileHandler = async (
  input: RenameVaultFileInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  try {
    const fileRecord = await fetchActiveFileForEdit(
      input.fileId,
      userId,
      ctx.db
    );
    const proj = await ctx.authGate.getProject(fileRecord.projectId);
    const scope = {
      type: "project" as const,
      id: fileRecord.projectId,
      workspaceId: proj?.workspaceId ?? "",
    };
    await Promise.all([
      ctx.authGate.assertProjectMember(fileRecord.projectId),
      ctx.permissions.assert("vault:file:rename", scope),
    ]);
    const file = await updateFileName(input.fileId, input.name, ctx.db);

    logger.info("Vault file renamed", {
      fileId: input.fileId,
      userId,
    });

    return { file };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to rename vault file", {
      err: error,
      userId,
      fileId: input.fileId,
    });
    throw new AppError("Failed to rename file");
  }
};
