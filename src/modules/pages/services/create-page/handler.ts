import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { CreatePageInput } from "./schema";

import { validateAccess } from "./steps/validate-access";
import { validateCollaborators } from "./steps/validate-collaborators";
import { createPageRecord } from "./steps/create-page-record";
import { initPageContent } from "./steps/init-page-content";
import { initPageStream } from "./steps/init-page-stream";

const logger = createLogger("pages:services:create-page");

/**
 * createPage — orchestrator
 *
 * Delegates each phase to a focused step file.
 * This file contains only sequencing logic — no business rules live here.
 *
 * Execution order (each step throws AppError on failure):
 *   1. validateAccess         — workspace, project, parent checks
 *   2. validateCollaborators  — batch workspace-member check
 *   3. createPageRecord       — atomic DB transaction (page + collaborators)
 *   4. initPageContent        — Y.Doc + S3 upload + s3Key update
 *   5. initPageStream         — Redis XGROUP CREATE MKSTREAM
 */
export const handler = async (input: CreatePageInput, ctx: ServiceContext) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  let pageId: string | undefined;

  try {
    await validateAccess(input, ctx, userId);

    const validCollaboratorIds = await validateCollaborators(
      input,
      ctx,
      userId
    );

    const { page } = await createPageRecord(
      input,
      ctx,
      userId,
      validCollaboratorIds
    );
    pageId = page.id;

    await initPageContent(page.id, input.title ?? "Untitled", ctx);

    await initPageStream(page.id);

    logger.info("Page created", {
      pageId: page.id,
      projectId: input.projectId,
      userId,
      collaborators: validCollaboratorIds.length + 1,
    });

    // Reload to include s3Key + snapshot fields populated by initPageContent
    const freshPage = await ctx.db.page.findUniqueOrThrow({
      where: { id: page.id },
    });

    return { page: freshPage };
  } catch (err: unknown) {
    // Run compensating delete for ALL failures if the page row was already committed.
    // This must run BEFORE the AppError check — initPageContent throws a plain Error
    // on S3 failure specifically so this branch is not short-circuited.
    if (pageId) {
      logger.warn("Compensating delete — removing orphaned page row", {
        pageId,
      });
      await ctx.db.page.delete({ where: { id: pageId } }).catch(() => {});
    }

    // Re-throw known errors without double-wrapping
    if (err instanceof AppError) throw err;

    logger.error("createPage failed", { err, userId, input });
    throw new AppError("Failed to create page");
  }
};
