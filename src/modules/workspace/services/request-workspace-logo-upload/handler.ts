/**
 * requestWorkspaceLogoUpload — Service Handler
 *
 * Step 1 of 2-step logo upload flow.
 * Returns a presigned PUT URL the client uses to upload directly to S3.
 *
 * Step 2: client calls updateWorkspace({ logoUrl }) with the returned logoUrl
 * AFTER the S3 PUT succeeds. No confirmUpload call is needed — logos are
 * not tracked in VaultFile and have no PENDING state.
 *
 * Vault infrastructure reused:
 *   - generatePresignedPut() from vault/lib/s3-keys.ts
 *   - VAULT_S3.PRESIGNED_PUT_TTL_SECONDS from vault/lib/constants.ts
 *   Both are pure infrastructure helpers. No VaultFile, no quota, no projectId.
 *
 * Auth:
 *   - permissions.assert("workspace:update") — ADMIN+ only (RBAC)
 *
 * Steps:
 *   1. [auth] assert("workspace:update", workspace scope)
 *   2. validateInput — done by Zod schema before handler runs (mimeType + sizeBytes)
 *   3. generateLogoUploadUrl — generate presigned PUT, compute final logoUrl
 *   4. return { presignedUrl, logoUrl, expiresAt }
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { RequestWorkspaceLogoUploadInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { generateLogoUploadUrl } from "./steps/generate-logo-upload-url";

const logger = createLogger("workspace:services:request-workspace-logo-upload");

export const requestWorkspaceLogoUpload = async (
  input: RequestWorkspaceLogoUploadInput,
  ctx: ServiceContext
) => {
  const { workspaceId, mimeType, sizeBytes } = input;

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();
  const scope = { type: "workspace" as const, id: workspaceId };
  await ctx.permissions.assert("workspace:update", scope);

  const { presignedUrl, logoUrl, expiresAt } = await generateLogoUploadUrl(
    workspaceId,
    mimeType,
    sizeBytes
  );

  logger.info("Logo upload slot created", { workspaceId });

  return { presignedUrl, logoUrl, expiresAt };
};
