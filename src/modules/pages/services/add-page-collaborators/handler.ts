/**
 * addPageCollaborators — Service Handler
 *
 * Upsert-semantics: invites new collaborators or updates existing roles in one call.
 *
 * Execution:
 *   Step 1 — checkAccess          : caller must be EDITOR on the page
 *   Step 2 — validateUsers        : all target userIds must exist in DB
 *   Step 3 — upsertCollaborators  : parallel upsert (create + role update) with user join
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { AddPageCollaboratorsInput } from "./schema";
import { checkAccess } from "./steps/check-access";
import { validateUsers } from "./steps/validate-users";
import { upsertCollaborators } from "./steps/upsert-collaborators";

const logger = createLogger("pages:services:add-page-collaborators");

export const handler = async (
  input: AddPageCollaboratorsInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    // Step 1 — EDITOR gate
    await checkAccess(input.pageId, userId, ctx.db);

    // Step 2 — pre-flight user existence check
    const targetIds = input.collaborators.map((c) => c.userId);
    await validateUsers(targetIds, ctx.db);

    // Step 3 — parallel upsert with user join
    const addedCollaborators = await upsertCollaborators(
      input.pageId,
      input.collaborators,
      ctx.db
    );

    logger.info("Collaborators added/updated", {
      pageId: input.pageId,
      count: addedCollaborators.length,
      userId,
    });

    return { addedCollaborators };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to add collaborators", {
      err: error,
      userId,
      pageId: input.pageId,
    });
    throw new AppError("Failed to add page collaborators");
  }
};
