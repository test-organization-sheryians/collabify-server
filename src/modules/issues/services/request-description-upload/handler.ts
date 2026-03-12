/**
 * requestDescriptionUpload — Service Handler (thin orchestrator, Phase 1 of 2)
 *
 * Steps:
 *   1. fetchIssue              — load issue lean (id, projectId)
 *   2. getProject              — cache-backed fetch for workspaceId
 *   3. assertProjectMember     — auth gate (cache-backed)
 *   4. assert issue:update     — RBAC permission check (upload = update)
 *   5. validateSize            — guard sizeBytes ≤ 2 MB
 *   6. createPendingFile       — pre-generate UUID, build S3 key, INSERT PENDING row
 *   7. generatePresignedPut    — return presignedUrl + expiresAt (TTL: 15 min)
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { RequestDescriptionUploadInput } from "./schema";
import type { RequestDescriptionUploadResult } from "./types";
import { fetchIssue } from "./steps/fetch-issue";
import { validateSize } from "./steps/validate-size";
import { createPendingFile } from "./steps/create-pending-file";
import { generatePresignedPut } from "./steps/generate-presigned-put";

const logger = createLogger("issues:services:request-description-upload");

export const requestDescriptionUploadHandler = async (
  input: RequestDescriptionUploadInput,
  ctx: ServiceContext
): Promise<RequestDescriptionUploadResult> => {
  const { userId } = ctx.auth;
  if (!userId || !ctx.authGate || !ctx.permissions) {
    throw AppError.unauthorized("User not authenticated.");
  }

  logger.debug("requestDescriptionUpload started", {
    userId,
    issueId: input.issueId,
  });

  const issue = await fetchIssue(input.issueId, ctx.db);
  const project = await ctx.authGate.getProject(issue.projectId);
  if (!project) throw AppError.notFound("Project not found.");

  const scope = {
    type: "project" as const,
    id: issue.projectId,
    workspaceId: project.workspaceId,
  };

  await Promise.all([
    ctx.authGate.assertProjectMember(issue.projectId),
    ctx.permissions.assert("issue:update", scope),
  ]);

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
