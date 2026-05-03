/**
 * getVaultAncestors — Query Handler
 *
 * Returns the ancestor folder chain for a given folder, ordered root → current.
 * Used by the vault breadcrumb on direct URL visits / page refresh.
 *
 * Execution:
 *   Step 1 — fetchAncestors: iterative walk up parentFolderId chain (max 20 hops)
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { GetVaultAncestorsInput } from "./schema";
import { fetchAncestors } from "./steps/fetch-ancestors";

const logger = createLogger("vault:queries:get-ancestors");

export const getVaultAncestorsHandler = async (
  input: GetVaultAncestorsInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  try {
    // Step 0 — derive projectId from folderId, assert project member
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
      await Promise.all([
        ctx.authGate.assertProjectMember(folder.projectId),
        ctx.permissions.assert("vault:read", scope),
      ]);
    }
    return await fetchAncestors(input.folderId, ctx.db);
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to get vault ancestors", {
      err: error,
      userId,
      folderId: input.folderId,
    });
    throw new AppError("Failed to fetch folder ancestors");
  }
};
