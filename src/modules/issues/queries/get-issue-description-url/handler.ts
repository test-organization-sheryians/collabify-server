/**
 * getIssueDescriptionUrl — Query Handler
 *
 * Steps:
 *   1. fetchIssueForDescription — load id, projectId, descriptionS3Key (lean)
 *   2. getProject               — cache-backed fetch for workspaceId
 *   3. assertProjectMember      — auth gate (cache-backed)
 *   4. assert issue:read        — RBAC permission check
 *   5. generatePresignedGet     — presigned S3 GET URL (TTL: 60 min)
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { GetIssueDescriptionUrlInput } from "./schema";
import { fetchIssueForDescription } from "./steps/fetch-issue";
import { generatePresignedGet } from "./steps/generate-presigned-get";

const logger = createLogger("issues:queries:get-issue-description-url");

export const getIssueDescriptionUrlHandler = async (
  input: GetIssueDescriptionUrlInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId || !ctx.authGate || !ctx.permissions) {
    throw AppError.unauthorized("User not authenticated.");
  }

  logger.debug("getIssueDescriptionUrl started", {
    userId,
    issueId: input.issueId,
  });

  const issue = await fetchIssueForDescription(input.issueId, ctx.db);
  const project = await ctx.authGate.getProject(issue.projectId);
  if (!project) throw AppError.notFound("Project not found.");

  const scope = {
    type: "project" as const,
    id: issue.projectId,
    workspaceId: project.workspaceId,
  };

  await Promise.all([
    ctx.authGate.assertProjectMember(issue.projectId),
    ctx.permissions.assert("issue:read", scope),
  ]);

  const result = await generatePresignedGet(issue);

  logger.debug("getIssueDescriptionUrl done", { issueId: input.issueId });
  return result;
};
