/**
 * getVaultDownloadUrl — Query Handler
 *
 * Returns a short-lived presigned GET URL for a vault file.
 * URL TTL: 5 minutes. Never cache on the client.
 *
 * Execution:
 *   Step 1 — fetchActiveFile      : verify file is ACTIVE and not deleted
 *   Step 2 — generateDownloadUrl  : produce presigned GET URL
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { GetVaultDownloadUrlInput } from "./schema";
import { fetchActiveFile } from "./steps/fetch-active-file";
import { generateDownloadUrl } from "./steps/generate-presigned-url";

const logger = createLogger("vault:queries:get-download-url");

export const getVaultDownloadUrlHandler = async (
  input: GetVaultDownloadUrlInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");

  try {
    const file = await fetchActiveFile(input.fileId, ctx.db);
    return generateDownloadUrl(file.s3Key);
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    logger.error("Failed to generate download URL", {
      err: error,
      userId,
      fileId: input.fileId,
    });
    throw new AppError("Failed to generate download URL");
  }
};
