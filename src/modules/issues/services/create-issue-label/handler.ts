/**
 * createIssueLabel — Service Handler (thin orchestrator)
 *
 * Steps:
 *   1. getProject                — cache-backed fetch for workspaceId
 *   2. assertProjectMember       — auth gate (cache-backed)
 *   3. assert issue.label:create  — RBAC permission check
 *   4. checkDuplicateName        — throw CONFLICT if name already exists
 *   5. insertLabel               — create IssueLabel row
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { CreateIssueLabelInput } from "./schema";
import type { CreateIssueLabelResult } from "./types";
import { checkDuplicateName } from "./steps/check-duplicate-name";
import { insertLabel } from "./steps/insert-label";

const logger = createLogger("issues:services:create-issue-label");

export const createIssueLabelHandler = async (
  input: CreateIssueLabelInput,
  ctx: ServiceContext
): Promise<CreateIssueLabelResult> => {
  const { userId } = ctx.auth;
  if (!userId || !ctx.authGate || !ctx.permissions) {
    throw AppError.unauthorized("User not authenticated.");
  }

  logger.debug("createIssueLabel started", {
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
    ctx.permissions.assert("issue.label:create", scope),
  ]);

  await checkDuplicateName(input.name, input.projectId, ctx.db);
  const label = await insertLabel(input, ctx.db);

  logger.info("createIssueLabel done", { labelId: label.id });
  return { label };
};
