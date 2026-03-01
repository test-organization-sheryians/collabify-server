/**
 * getVaultChildren — Query Handler
 *
 * Fetches immediate children of a vault folder (folders + paginated files).
 * parentFolderId = null → Home (root level).
 *
 * Execution:
 *   Step 1 — fetchFolders  : all child folders (no pagination — folders are always few)
 *   Step 2 — fetchFiles    : cursor-paginated ACTIVE files with uploader info
 *   Step 3 — countFiles    : total ACTIVE file count (for badge / pagination UI)
 *   Steps 1-3 run in parallel via Promise.all
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { GetVaultChildrenInput } from "./schema";
import { fetchFolders } from "./steps/fetch-folders";
import { fetchFiles } from "./steps/fetch-files";
import { countFiles } from "./steps/count-files";

const logger = createLogger("vault:queries:get-children");

export const getVaultChildrenHandler = async (
  input: GetVaultChildrenInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    const [folders, filesResult, totalFileCount] = await Promise.all([
      fetchFolders(input, ctx.db),
      fetchFiles(input, ctx.db),
      countFiles(input.projectId, input.parentFolderId, ctx.db),
    ]);

    return {
      folders,
      files: filesResult.files,
      totalFileCount,
      hasNextPage: filesResult.hasNextPage,
      nextCursor: filesResult.nextCursor,
    };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to get vault children", {
      err: error,
      userId,
      projectId: input.projectId,
      parentFolderId: input.parentFolderId,
    });
    throw new AppError("Failed to fetch vault contents");
  }
};
