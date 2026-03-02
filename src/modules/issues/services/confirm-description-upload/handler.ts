/**
 * confirmDescriptionUpload — Service Handler (thin orchestrator, Phase 2 of 2)
 *
 * Steps:
 *   1. fetchPendingFile        — load file record, assert status = PENDING
 *   2. fetchIssue              — load parent issue lean
 *   3. verifyProjectMember     — auth gate
 *   4. verifyS3Object          — HeadObject: confirm object exists, get contentLength
 *   5. activateFile            — tx: supersede old ACTIVE → activate this → update issue.descriptionS3Key
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { ConfirmDescriptionUploadInput } from "./schema";
import type { ConfirmDescriptionUploadResult } from "./types";
import { fetchPendingFile } from "./steps/fetch-pending-file";
import { fetchIssue } from "./steps/fetch-issue";
import { verifyProjectMember } from "./steps/verify-project-member";
import { verifyS3Object } from "./steps/verify-s3-object";
import { activateFile } from "./steps/activate-file";

const logger = createLogger("issues:services:confirm-description-upload");

export const confirmDescriptionUploadHandler = async (
  input: ConfirmDescriptionUploadInput,
  ctx: ServiceContext
): Promise<ConfirmDescriptionUploadResult> => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated.");

  logger.debug("confirmDescriptionUpload started", {
    userId,
    fileId: input.descriptionFileId,
  });

  const fileRecord = await fetchPendingFile(input.descriptionFileId, ctx.db);
  const issue = await fetchIssue(fileRecord.issueId, ctx.db);
  await verifyProjectMember(issue.projectId, userId, ctx.db);
  const meta = await verifyS3Object(fileRecord.s3Key);
  const updatedIssue = await activateFile(fileRecord, meta, ctx.db);

  logger.info("confirmDescriptionUpload done", {
    issueId: updatedIssue.id,
    fileId: fileRecord.id,
  });
  return { issue: updatedIssue };
};
