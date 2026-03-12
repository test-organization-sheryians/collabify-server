/**
 * updateIssueLabel — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. fetchLabel                — load label lean
 *   2. getProject                — cache-backed fetch for workspaceId
 *   3. assertProjectMember       — auth gate (cache-backed)
 *   4. assert issue.label:update  — RBAC permission check
 *   5. patchLabel                — update name/color
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { UpdateIssueLabelInput } from "./schema";
import type { UpdateIssueLabelResult } from "./types";
import { fetchLabel } from "./steps/fetch-label";
import { patchLabel } from "./steps/patch-label";

const logger = createLogger("issues:services:update-issue-label");

export const updateIssueLabelHandler = async (
  input: UpdateIssueLabelInput,
  ctx: ServiceContext
): Promise<UpdateIssueLabelResult> => {
  const { userId } = ctx.auth;
  if (!userId || !ctx.authGate || !ctx.permissions) {
    throw AppError.unauthorized("User not authenticated.");
  }

  logger.debug("updateIssueLabel started", { userId, labelId: input.labelId });

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
    ctx.permissions.assert("issue.label:update", scope),
  ]);

  const label = await patchLabel(input, ctx.db);

  logger.info("updateIssueLabel done", { labelId: label.id });
  return { label };
};
