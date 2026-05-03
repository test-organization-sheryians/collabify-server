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
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  try {
    // Step 0 — derive projectId from node, assert project member
    if (input.type === "FOLDER") {
      const node = await fetchFolderNode(input.id, ctx.db);
      const proj = await ctx.authGate.getProject(node.projectId);
      const scope = {
        type: "project" as const,
        id: node.projectId,
        workspaceId: proj?.workspaceId ?? "",
      };
      await Promise.all([
        ctx.authGate.assertProjectMember(node.projectId),
        ctx.permissions.assert("vault:read", scope),
      ]);
      return node;
    }
    const node = await fetchFileNode(input.id, ctx.db);
    const proj = await ctx.authGate.getProject(node.projectId);
    const scope = {
      type: "project" as const,
      id: node.projectId,
      workspaceId: proj?.workspaceId ?? "",
    };
    await Promise.all([
      ctx.authGate.assertProjectMember(node.projectId),
      ctx.permissions.assert("vault:file:download", scope),
    ]);
    return node;
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to get vault node", { err: error, userId, ...input });
    throw new AppError("Failed to fetch vault item");
  }
};
