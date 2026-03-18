/**
 * getVaultUsage — Query Handler
 *
 * Returns storage usage for the project and workspace.
 * UI polls this every 60 seconds and invalidates on upload/delete.
 *
 * Execution:
 *   Step 1 — fetchUsage : parallel fetch of PROJECT + WORKSPACE VaultUsageRecord rows
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { GetVaultUsageInput } from "./schema";
import { fetchUsage } from "./steps/fetch-usage";

const logger = createLogger("vault:queries:get-vault-usage");

export const getVaultUsageHandler = async (
  input: GetVaultUsageInput,
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
      ctx.permissions.assert("vault:read", scope),
    ]);
    return fetchUsage(input.projectId, ctx.db);
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to get vault usage", {
      err: error,
      userId,
      projectId: input.projectId,
    });
    throw new AppError("Failed to fetch storage usage");
  }
};
