/**
 * requestDescriptionUpload — Service Handler (thin orchestrator, Phase 1 of 2)
 *
 * Steps:
 *   1. fetchIssue              — load issue lean (id, projectId, workspaceId)
 *   2. verifyProjectMember     — auth gate
 *   3. validateSize            — guard sizeBytes ≤ 2 MB
 *   4. createPendingFile       — pre-generate UUID, build S3 key, INSERT PENDING row
 *   5. generatePresignedPut    — return presignedUrl + expiresAt (TTL: 15 min)
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { RequestDescriptionUploadInput } from "./schema";
import type { RequestDescriptionUploadResult } from "./types";
import { fetchIssue } from "./steps/fetch-issue";
import { verifyProjectMember } from "./steps/verify-project-member";
import { validateSize } from "./steps/validate-size";
import { createPendingFile } from "./steps/create-pending-file";
import { generatePresignedPut } from "./steps/generate-presigned-put";

const logger = createLogger("issues:services:request-description-upload");

export const requestDescriptionUploadHandler = async (
  input: RequestDescriptionUploadInput,
  ctx: ServiceContext
): Promise<RequestDescriptionUploadResult> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated.");

  logger.debug("requestDescriptionUpload started", {
    userId,
    issueId: input.issueId,
  });

  const issue = await fetchIssue(input.issueId, ctx.db);
  await verifyProjectMember(issue.projectId, userId, ctx.db);
  validateSize(input.sizeBytes);
  const { fileId, s3Key } = await createPendingFile(
    issue,
    input.issueId,
    ctx.db
  );
  const { presignedUrl, expiresAt } = await generatePresignedPut(s3Key);

  logger.info("requestDescriptionUpload done", { fileId });
  return { presignedUrl, descriptionFileId: fileId, expiresAt };
};
