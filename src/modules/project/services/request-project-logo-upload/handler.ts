/**
 * requestProjectLogoUpload — Service Handler
 *
 * Step 1 of 2-step project logo upload flow.
 * Returns a presigned PUT URL the client uses to upload directly to S3.
 *
 * Step 2: client calls updateProject({ logoUrl }) with the returned logoUrl
 * AFTER the S3 PUT succeeds. No confirmUpload call is needed — logos are
 * not tracked in VaultFile and have no PENDING state.
 *
 * Auth:
 *   - permissions.assert("project:update") — MANAGER+ only (RBAC)
 *
 * Steps:
 *   1. getProject — fetch workspaceId for scope resolution
 *   2. [auth] assert("project:update", project scope)
 *   3. generateProjectLogoUploadUrl — generate presigned PUT, compute final logoUrl
 *   4. return { presignedUrl, logoUrl, expiresAt }
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { RequestProjectLogoUploadInput } from "./schema";
import type { ServiceContext } from "@/graphql/types";
import { generateProjectLogoUploadUrl } from "./steps/generate-project-logo-upload-url";

const logger = createLogger("project:services:request-project-logo-upload");

export const requestProjectLogoUpload = async (
  input: RequestProjectLogoUploadInput,
  ctx: ServiceContext
) => {
  const { projectId, mimeType, sizeBytes } = input;

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const project = await ctx.authGate.getProject(projectId);
  if (!project) throw AppError.notFound("Project not found");

  const scope = {
    type: "project" as const,
    id: projectId,
    workspaceId: project.workspaceId,
  };
  await ctx.permissions.assert("project:update", scope);

  const { presignedUrl, logoUrl, expiresAt } = await generateProjectLogoUploadUrl(
    projectId,
    mimeType,
    sizeBytes
  );

  logger.info("Project logo upload slot created", { projectId });

  return { presignedUrl, logoUrl, expiresAt };
};
