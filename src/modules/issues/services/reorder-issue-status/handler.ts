/**
 * reorderIssueStatus — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. fetchStatus               — load status lean
 *   2. getProject                — cache-backed fetch for workspaceId
 *   3. assertProjectMember       — auth gate (cache-backed)
 *   4. assert issue.status:update — RBAC permission check (reorder = update)
 *   5. updatePosition            — set position = newPosition
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { ReorderIssueStatusInput } from "./schema";
import type { ReorderIssueStatusResult } from "./types";
import { fetchStatus } from "./steps/fetch-status";
import { updatePosition } from "./steps/update-position";

const logger = createLogger("issues:services:reorder-issue-status");

export const reorderIssueStatusHandler = async (
  input: ReorderIssueStatusInput,
  ctx: ServiceContext
): Promise<ReorderIssueStatusResult> => {
  const { userId } = ctx.auth;
  if (!userId || !ctx.authGate || !ctx.permissions) {
    throw AppError.unauthorized("User not authenticated.");
  }

  logger.debug("reorderIssueStatus started", {
    userId,
    statusId: input.statusId,
  });

  const existing = await fetchStatus(input.statusId, ctx.db);
  const project = await ctx.authGate.getProject(existing.projectId);
  if (!project) throw AppError.notFound("Project not found.");

  const scope = {
    type: "project" as const,
    id: existing.projectId,
    workspaceId: project.workspaceId,
  };

  await Promise.all([
    ctx.authGate.assertProjectMember(existing.projectId),
    ctx.permissions.assert("issue.status:update", scope),
  ]);

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
