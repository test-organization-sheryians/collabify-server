/**
 * getVaultSidebar — Query Handler
 *
 * Returns sidebar data: user-pinned folders + system folders.
 * Called once on Vault mount, never during folder navigation.
 *
 * Execution (parallel):
 *   Step 1 — fetchPinnedFolders  : user's pinned folders for this project
 *   Step 2 — fetchSystemFolders  : system folders (From Chat, From Pages, etc.)
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { GetVaultSidebarInput } from "./schema";
import { fetchPinnedFolders } from "./steps/fetch-pinned-folders";
import { fetchSystemFolders } from "./steps/fetch-system-folders";

const logger = createLogger("vault:queries:get-sidebar");

export const getVaultSidebarHandler = async (
  input: GetVaultSidebarInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    const [pinnedFolders, systemFolders] = await Promise.all([
      fetchPinnedFolders(userId, input.projectId, ctx.db),
      fetchSystemFolders(input.projectId, ctx.db),
    ]);

    return { pinnedFolders, systemFolders };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to get vault sidebar", {
      err: error,
      userId,
      projectId: input.projectId,
    });
    throw new AppError("Failed to fetch vault sidebar");
  }
};
