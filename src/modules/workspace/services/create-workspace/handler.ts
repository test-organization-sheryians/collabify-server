/**
 * createWorkspace — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. enforceQuota          — MAX_OWNED_WORKSPACES quota check
 *   2. verifySlugReservation — assert user holds Redis reservation for slug
 *   3. insertWorkspace       — $transaction: workspace.create + owner member
 *   4. finalizeLock          — promote lock → exists-cache; swallow Redis errors
 */
import { SlugUtil } from "@/shared/utils/slug.util";
import { createLogger } from "@/shared/lib/logger";
import type { CreateWorkspaceInput } from "./types";
import type { ServiceContext } from "@/graphql/types";
import { enforceQuota } from "./steps/enforce-quota";
import { verifySlugReservation } from "./steps/verify-slug-reservation";
import { insertWorkspace } from "./steps/insert-workspace";
import { finalizeLock } from "./steps/finalize-lock";

const logger = createLogger("workspace:services:create-workspace");

export const createWorkspace = async (
  input: CreateWorkspaceInput,
  ctx: ServiceContext
) => {
  const { slug, name, userId } = input;
  const { db, redis } = ctx;

  const normalizedSlug = SlugUtil.sanitize(slug);
  const sanitizedName = name.trim().replace(/[<>]/g, "");

  await enforceQuota(userId, db);
  const lockKey = await verifySlugReservation(normalizedSlug, userId, redis);
  const workspace = await insertWorkspace(
    sanitizedName,
    normalizedSlug,
    userId,
    lockKey,
    db,
    redis
  );

  await finalizeLock(normalizedSlug, lockKey, userId, redis);

  logger.info("Created Workspace (Sync)", {
    workspaceId: workspace.id,
    slug: normalizedSlug,
    userId,
  });

  return workspace;
};
