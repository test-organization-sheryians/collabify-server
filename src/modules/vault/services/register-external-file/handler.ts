/**
 * registerExternalFile — Service Handler
 *
 * GraphQL-facing wrapper around VaultIntakeService.registerExternalFile().
 *
 * This handler is the entry point for modules (Chat, Pages, Issues, Whiteboard)
 * that need to register a file into Vault from a GraphQL mutation context.
 * The underlying VaultIntakeService contains all business logic:
 *   - MIME/extension validation
 *   - Storage quota enforcement (now transactional per C-B3)
 *   - System folder resolution
 *   - PENDING VaultFile creation
 *   - Presigned PUT URL generation
 *
 * RBAC: caller must be a projectMember (asserted by authGate).
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { RegisterExternalFileInput } from "./schema";
import {
  registerExternalFile as intakeRegisterExternalFile,
} from "../../lib/vault-intake.service";

const logger = createLogger("vault:services:register-external-file");

export const registerExternalFileHandler = async (
  input: RegisterExternalFileInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized("User not authenticated");
  if (!ctx.authGate) throw AppError.unauthorized();

  logger.info("registerExternalFile started", {
    userId,
    projectId: input.projectId,
    source: input.source,
    name: input.name,
    sizeBytes: input.sizeBytes,
  });

  // RBAC — caller must be a project member
  await ctx.authGate.assertProjectMember(input.projectId);

  const result = await intakeRegisterExternalFile(
    {
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      uploaderUserId: userId,
      source: input.source,
      sourceId: input.sourceId ?? "",
      name: input.name,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    },
    ctx.db
  );

  logger.info("registerExternalFile done", {
    fileId: result.fileId,
    source: input.source,
  });

  return {
    fileId: result.fileId,
    presignedUrl: result.presignedUrl,
    expiresAt: result.expiresAt,
  };
};
