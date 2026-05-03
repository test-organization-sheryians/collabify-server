/**
 * deleteVaultFile — Service Handler
 *
 * Soft-deletes a file and releases its storage usage atomically.
 * S3 lifecycle rule expires the object after 30 days.
 *
 * Steps:
 *   1. fetchActiveFileForEdit — verify file is ACTIVE and owned by user
 *   2. softDeleteFile         — set deletedAt (parallel with step 3)
 *   3. releaseUsage           — decrement usedBytes + fileCount on usage records
 *   Steps 2 and 3 run in parallel via Promise.all.
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { DeleteVaultFileInput } from "./schema";
import { fetchActiveFileForEdit } from "./steps/fetch-file";
import { softDeleteFile } from "./steps/soft-delete";
import { releaseUsage } from "./steps/release-usage";
import { orphanMentions } from "@/modules/mention/services";

const logger = createLogger("vault:services:delete-file");

export const deleteVaultFileHandler = async (
  input: DeleteVaultFileInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  try {
    const file = await fetchActiveFileForEdit(input.fileId, userId, ctx.db);
    const proj = await ctx.authGate.getProject(file.projectId);
    const scope = {
      type: "project" as const,
      id: file.projectId,
      workspaceId: proj?.workspaceId ?? "",
    };
    await Promise.all([
      ctx.authGate.assertProjectMember(file.projectId),
      ctx.permissions.assert("vault:file:delete", scope),
    ]);

    await Promise.all([
      softDeleteFile(file.id, ctx.db),
      releaseUsage(file.projectId, file.workspaceId, file.sizeBytes, ctx.db),
    ]);

    await orphanMentions.handler({ targetEntityId: file.id }, ctx);

    logger.info("Vault file soft-deleted", {
      fileId: file.id,
      projectId: file.projectId,
      userId,
    });

    return { success: true, id: file.id };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to delete vault file", {
      err: error,
      userId,
      fileId: input.fileId,
    });
    throw new AppError("Failed to delete file");
  }
};
