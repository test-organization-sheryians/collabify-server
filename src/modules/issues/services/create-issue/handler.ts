/**
 * createIssue — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. getProject           — cache-backed fetch for workspaceId
 *   2. assertProjectMember  — auth gate (cache-backed)
 *   3. assert issue:create  — RBAC permission check (cache-backed)
 *   4. validateStatus       — statusId belongs to project
 *   5. validateLabels       — all labelIds belong to project
 *   6. insertIssue          — atomic: seq number + position + create + labels
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { CreateIssueInput } from "./schema";
import type { CreateIssueResult } from "./types";
import { validateStatus } from "./steps/validate-status";
import { validateLabels } from "./steps/validate-labels";
import { insertIssue } from "./steps/insert-issue";

const logger = createLogger("issues:services:create-issue");

export const createIssueHandler = async (
  input: CreateIssueInput,
  ctx: ServiceContext
): Promise<CreateIssueResult> => {
  const { userId } = ctx.auth;
  if (!userId || !ctx.authGate || !ctx.permissions) {
    throw AppError.unauthorized("User not authenticated.");
  }

  logger.debug("createIssue started", { userId, projectId: input.projectId });

  const project = await ctx.authGate.getProject(input.projectId);
  if (!project) throw AppError.notFound("Project not found.");

  const scope = {
    type: "project" as const,
    id: input.projectId,
    workspaceId: project.workspaceId,
  };

  await Promise.all([
    ctx.authGate.assertProjectMember(input.projectId),
    ctx.permissions.assert("issue:create", scope),
  ]);

  await validateStatus(input.statusId, input.projectId, ctx.db);
  await validateLabels(input.labelIds, input.projectId, ctx.db);
  const issue = await insertIssue(input, project.workspaceId, userId, ctx.db);

  logger.info("createIssue done", { issueId: issue.id, number: issue.number });
  return { issue };
};
