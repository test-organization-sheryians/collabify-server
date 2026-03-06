/**
 * reorderIssueStatus — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. fetchStatus          — load status lean
 *   2. verifyProjectMember  — auth gate
 *   3. updatePosition       — set position = newPosition
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { ReorderIssueStatusInput } from "./schema";
import type { ReorderIssueStatusResult } from "./types";
import { fetchStatus } from "./steps/fetch-status";
import { verifyProjectMember } from "./steps/verify-project-member";
import { updatePosition } from "./steps/update-position";

const logger = createLogger("issues:services:reorder-issue-status");

export const reorderIssueStatusHandler = async (
  input: ReorderIssueStatusInput,
  ctx: ServiceContext
): Promise<ReorderIssueStatusResult> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated.");

  logger.debug("reorderIssueStatus started", {
    userId,
    statusId: input.statusId,
  });

  const existing = await fetchStatus(input.statusId, ctx.db);
  await verifyProjectMember(existing.projectId, userId, ctx.db);
  const status = await updatePosition(
    input.statusId,
    input.newPosition,
    ctx.db
  );

  logger.info("reorderIssueStatus done", {
    statusId: status.id,
    position: input.newPosition,
  });
  return { status };
};
