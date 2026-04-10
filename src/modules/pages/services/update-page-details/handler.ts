/**
 * updatePageDetails — Service Handler
 *
 * Updates page emoji and/or coverImageUrl. Both fields are optional (partial update).
 *
 * Execution:
 *   Step 1 — [auth] assertPageCollaborator + assert("page:update") — parallel
 *   Step 2 — updateRecord : page.update({ emojiIcon?, coverImageUrl? })
 *   Step 3 — broadcast    : PUBLISH page:details-updated (best-effort)
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { UpdatePageDetailsInput } from "./schema";
import { updateRecord } from "./steps/update-record";
import { broadcast } from "./steps/broadcast";

const logger = createLogger("pages:services:update-page-details");

export const handler = async (
  input: UpdatePageDetailsInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  try {
    // Step 1 — Auth gate (cache-backed)
    const cachedPage = await ctx.authGate.getPage(input.pageId);
    if (!cachedPage) throw AppError.notFound("Page not found");
    const proj = await ctx.authGate.getProject(cachedPage.projectId);
    const scope = {
      type: "resource" as const,
      id: input.pageId,
      projectId: cachedPage.projectId,
      workspaceId: proj?.workspaceId ?? "",
    };
    await Promise.all([
      ctx.authGate.assertPageCollaborator(input.pageId),
      ctx.permissions.assert("page:update", scope),
    ]);

    // Step 2 — DB update (partial — only provided fields)
    const fields = {
      ...(input.emoji !== undefined && { emoji: input.emoji }),
      ...(input.coverImageUrl !== undefined && { coverImageUrl: input.coverImageUrl }),
    };
    const page = await updateRecord(input.pageId, fields, ctx.db);

    // Step 3 — Broadcast (best-effort)
    await broadcast(input.pageId, userId, fields, ctx.redis).catch((err) =>
      logger.error("Broadcast failed after updatePageDetails", {
        err,
        pageId: input.pageId,
      })
    );

    logger.info("Page details updated", {
      pageId: input.pageId,
      fields,
      userId,
    });
    return { page };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to update page details", {
      err: error,
      userId,
      pageId: input.pageId,
    });
    throw new AppError("Failed to update page details");
  }
};
