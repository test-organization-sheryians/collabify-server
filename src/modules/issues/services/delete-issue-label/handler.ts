/**
 * deleteIssueLabel — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. fetchLabel                — load label lean
 *   2. getProject                — cache-backed fetch for workspaceId
 *   3. assertProjectMember       — auth gate (cache-backed)
 *   4. assert issue.label:delete  — RBAC permission check
 *   5. softDeleteLabel           — set deletedAt = now()
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { DeleteIssueLabelInput } from "./schema";
import type { DeleteIssueLabelResult } from "./types";
import { fetchLabel } from "./steps/fetch-label";
import { softDeleteLabel } from "./steps/soft-delete-label";

const logger = createLogger("issues:services:delete-issue-label");

export const deleteIssueLabelHandler = async (
  input: DeleteIssueLabelInput,
  ctx: ServiceContext
): Promise<DeleteIssueLabelResult> => {
  const { userId } = ctx.auth;
  if (!userId || !ctx.authGate || !ctx.permissions) {
    throw AppError.unauthorized("User not authenticated.");
  }

  logger.debug("deleteIssueLabel started", { userId, labelId: input.labelId });

  const existing = await fetchLabel(input.labelId, ctx.db);
  const project = await ctx.authGate.getProject(existing.projectId);
  if (!project) throw AppError.notFound("Project not found.");

  const scope = {
    type: "project" as const,
    id: existing.projectId,
    workspaceId: project.workspaceId,
  };

  await Promise.all([
    ctx.authGate.assertProjectMember(existing.projectId),
    ctx.permissions.assert("issue.label:delete", scope),
  ]);

  await softDeleteLabel(input.labelId, ctx.db);

  logger.info("deleteIssueLabel done", { labelId: input.labelId });
  return { success: true, id: input.labelId };
};
