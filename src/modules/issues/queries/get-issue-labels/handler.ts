/**
 * getIssueLabels — Query Handler
 *
 * Steps:
 *   1. getProject                — cache-backed fetch for workspaceId
 *   2. assertProjectMember       — auth gate (cache-backed)
 *   3. assert issue.label:read   — RBAC permission check
 *   4. fetchLabels               — return project labels ordered by createdAt
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { GetIssueLabelsInput } from "./schema";
import { fetchLabels } from "./steps/fetch-labels";

const logger = createLogger("issues:queries:get-issue-labels");

export const getIssueLabelsHandler = async (
  input: GetIssueLabelsInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId || !ctx.authGate || !ctx.permissions) {
    throw AppError.unauthorized("User not authenticated.");
  }

  logger.debug("getIssueLabels started", {
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
    ctx.permissions.assert("issue:label:manage", scope),
  ]);

  const labels = await fetchLabels(input.projectId, ctx.db);

  logger.debug("getIssueLabels done", { count: labels.length });
  return labels;
};
