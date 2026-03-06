/**
 * getVaultNode — Query Handler
 *
 * Returns full metadata for a single folder or file.
 * Branches on type: FOLDER → fetchFolderNode, FILE → fetchFileNode
 *
 * Execution:
 *   FOLDER: Step 1 — fetchFolderNode (findFirst + parallel childCount + fileCount)
 *   FILE:   Step 1 — fetchFileNode   (findFirst with uploader include)
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { GetVaultNodeInput } from "./schema";
import { fetchFolderNode } from "./steps/fetch-folder-node";
import { fetchFileNode } from "./steps/fetch-file-node";

const logger = createLogger("vault:queries:get-node");

export const getVaultNodeHandler = async (
  input: GetVaultNodeInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    if (input.type === "FOLDER") {
      return await fetchFolderNode(input.id, ctx.db);
    }
    return await fetchFileNode(input.id, ctx.db);
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to get vault node", { err: error, userId, ...input });
    throw new AppError("Failed to fetch vault item");
  }
};
