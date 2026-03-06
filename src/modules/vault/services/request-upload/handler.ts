/**
 * requestVaultUpload — Service Handler
 *
 * Step 1 of 2-step upload flow.
 * Returns a presigned PUT URL the client uses to upload directly to S3.
 *
 * Steps:
 *   1. validateInput  — MIME, size, blocked extensions
 *   2. checkQuota     — enforce project + workspace limits, reserve bytes
 *   3. createPendingFile — PENDING VaultFile row with deterministic S3 key
 *   4. generatePutUrl — presigned PUT URL (15 min TTL)
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { RequestVaultUploadInput } from "./schema";
import { validateUploadInput } from "./steps/validate-input";
import { checkQuota } from "./steps/check-quota";
import { createPendingFile } from "./steps/create-pending-file";
import { generatePutUrl } from "./steps/generate-presigned-url";

const logger = createLogger("vault:services:request-upload");

export const requestVaultUploadHandler = async (
  input: RequestVaultUploadInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  logger.info("requestVaultUpload started", {
    userId,
    projectId: input.projectId,
    name: input.name,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    folderId: input.folderId ?? null,
  });

  validateUploadInput(input);

  await checkQuota(input.projectId, input.workspaceId, input.sizeBytes, ctx.db);

  const file = await createPendingFile(
    { ...input, uploaderUserId: userId },
    ctx.db
  );

  const { url, expiresAt } = await generatePutUrl(
    file.s3Key,
    input.sizeBytes,
    input.mimeType
  );

  logger.info("Upload slot created", { fileId: file.id, userId });
  logger.info("requestVaultUpload done", {
    fileId: file.id,
    s3Key: file.s3Key,
    expiresAt,
  });

  return { fileId: file.id, presignedUrl: url, expiresAt };
};
