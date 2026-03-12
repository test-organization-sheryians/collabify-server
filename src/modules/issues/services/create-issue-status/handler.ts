/**
 * createIssueStatus — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. getProject                — cache-backed fetch for workspaceId
 *   2. assertProjectMember       — auth gate (cache-backed)
 *   3. assert issue.status:create — RBAC permission check
 *   4. insertStatus              — append column after last position
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { CreateIssueStatusInput } from "./schema";
import type { CreateIssueStatusResult } from "./types";
import { insertStatus } from "./steps/insert-status";

const logger = createLogger("issues:services:create-issue-status");

export const createIssueStatusHandler = async (
  input: CreateIssueStatusInput,
  ctx: ServiceContext
): Promise<CreateIssueStatusResult> => {
  const { userId } = ctx.auth;
  if (!userId || !ctx.authGate || !ctx.permissions) {
    throw AppError.unauthorized("User not authenticated.");
  }

  logger.debug("createIssueStatus started", {
    userId,
    projectId: input.projectId,
  });

  const project = await ctx.authGate.getProject(input.projectId);
  if (!project) throw AppError.notFound("Project not found.");

  const scope = {
    type: "project" as const,
    id: input.projectId,
    workspaceId: project.workspaceId,
  };

  await Promise.all([
    ctx.authGate.assertProjectMember(input.projectId),
    ctx.permissions.assert("issue.status:create", scope),
  ]);

  const status = await insertStatus(input, ctx.db);

  logger.info("createIssueStatus done", { statusId: status.id });
  return { status };
};
