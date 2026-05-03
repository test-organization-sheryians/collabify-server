/**
 * renameWorkspaceSlug — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - permissions.assert("workspace:update") — ADMIN+ only (RBAC)
 *
 * Prerequisites:
 *   - Actor must have called checkSlugAvailability for the new slug FIRST.
 *     That call creates a 180s Redis reservation. This service verifies it.
 *
 * Steps:
 *   1. [auth] assert("workspace:update", workspace scope)
 *   2. sanitize new slug via SlugUtil.sanitize()
 *   3. verifySlugReservation — confirm actor holds Redis lock for newSlug
 *   4. renameSlugInDb — atomic UPDATE workspace SET slug = newSlug
 *   5. finalizeSlugRename — promote lock → exists cache; delete old exists cache
 */
import { AppError } from "@/shared/errors";
import { SlugUtil } from "@/shared/utils/slug.util";
import { createLogger } from "@/shared/lib/logger";
import type { RenameWorkspaceSlugInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { verifySlugReservation } from "./steps/verify-slug-reservation";
import { renameSlugInDb } from "./steps/rename-slug-in-db";
import { finalizeSlugRename } from "./steps/finalize-slug-rename";

const logger = createLogger("workspace:services:rename-workspace-slug");

export const renameWorkspaceSlug = async (
  input: RenameWorkspaceSlugInput,
  ctx: ServiceContext
) => {
  const { workspaceId, actorUserId, slug } = input;
  const { db, redis } = ctx;

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();
  const scope = { type: "workspace" as const, id: workspaceId };
  await ctx.permissions.assert("workspace:update", scope);

  // Fetch current slug BEFORE rename (needed for old cache cleanup)
  const current = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { slug: true },
  });
  if (!current) throw AppError.notFound("Workspace not found.");
  const oldSlug = current.slug;

  const newSlug = SlugUtil.sanitize(slug);

  // No-op guard: if new slug === old slug, return current workspace without touching Redis
  if (newSlug === oldSlug) {
    return db.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
  }

  const lockKey = await verifySlugReservation(newSlug, actorUserId, redis);
  const workspace = await renameSlugInDb(workspaceId, newSlug, db);
  await finalizeSlugRename(newSlug, lockKey, oldSlug, actorUserId, redis);

  logger.info("Workspace slug renamed", {
    workspaceId,
    oldSlug,
    newSlug,
    actorUserId,
  });

  return workspace;
};
