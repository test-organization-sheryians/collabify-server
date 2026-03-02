/**
 * getIssueDescriptionUrl — Query Handler
 *
 * Steps:
 *   1. fetchIssueForDescription — load only id, projectId, descriptionS3Key (lean select)
 *   2. verifyProjectMember      — auth gate
 *   3. generatePresignedGet     — presigned S3 GET URL (TTL: 60 min)
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { GetIssueDescriptionUrlInput } from "./schema";
import { verifyProjectMember } from "./steps/verify-project-member";
import { fetchIssueForDescription } from "./steps/fetch-issue";
import { generatePresignedGet } from "./steps/generate-presigned-get";

const logger = createLogger("issues:queries:get-issue-description-url");

export const getIssueDescriptionUrlHandler = async (
  input: GetIssueDescriptionUrlInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated.");

  logger.debug("getIssueDescriptionUrl started", {
    userId,
    issueId: input.issueId,
  });

  const issue = await fetchIssueForDescription(input.issueId, ctx.db);
  await verifyProjectMember(issue.projectId, userId, ctx.db);
  const result = await generatePresignedGet(issue);

  logger.debug("getIssueDescriptionUrl done", { issueId: input.issueId });
  return result;
};
