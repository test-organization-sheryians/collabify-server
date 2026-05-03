/**
 * VaultIntakeService — entry point for non-Vault modules uploading files.
 *
 * Called by Chat, Pages, Whiteboard, and Tasks when they embed/attach a file.
 * Creates a PENDING VaultFile row + returns a presigned PUT URL.
 * The calling module must call confirmVaultUpload after the S3 PUT succeeds.
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { PrismaClient } from "@prisma/client";
import {
  VAULT_ALLOWED_MIME_TYPES,
  VAULT_BLOCKED_EXTENSIONS,
  VAULT_LIMITS,
} from "./constants";
import { buildS3Key, generatePresignedPut } from "./s3-keys";
import { enforceVaultQuota } from "./quota-guard";
import { ensureSystemFolder } from "./system-folders";
import type { VaultFileSource } from "@prisma/client";
import path from "path";

const logger = createLogger("vault:intake");

export interface RegisterExternalFileInput {
  workspaceId: string;
  projectId: string;
  uploaderUserId: string;
  /** The source module — determines which system folder the file lands in */
  source: Exclude<VaultFileSource, "VAULT">;
  /** ID of the source entity (pageId, conversationId, boardId, taskId) */
  sourceId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

export interface RegisterExternalFileResult {
  fileId: string;
  presignedUrl: string;
  expiresAt: Date;
}

export async function registerExternalFile(
  input: RegisterExternalFileInput,
  db: PrismaClient
): Promise<RegisterExternalFileResult> {
  const {
    workspaceId,
    projectId,
    uploaderUserId,
    source,
    sourceId,
    name,
    mimeType,
    sizeBytes,
  } = input;

  // ── Validate ───────────────────────────────────────────────────────────────
  if (sizeBytes > VAULT_LIMITS.MAX_FILE_SIZE_BYTES) {
    throw AppError.badRequest(
      `File exceeds maximum size of ${VAULT_LIMITS.MAX_FILE_SIZE_BYTES / 1024 / 1024} MB`
    );
  }

  if (!VAULT_ALLOWED_MIME_TYPES.has(mimeType)) {
    throw AppError.badRequest(`MIME type '${mimeType}' is not allowed`);
  }

  const ext = path.extname(name).toLowerCase();
  if (VAULT_BLOCKED_EXTENSIONS.has(ext)) {
    throw AppError.badRequest(`File extension '${ext}' is not allowed`);
  }

  // ── Quota check + reserve bytes ────────────────────────────────────────────
  await enforceVaultQuota({
    projectId,
    workspaceId,
    incomingSizeBytes: sizeBytes,
    db,
  });

  // ── Ensure system folder exists ────────────────────────────────────────────
  const systemFolder = await ensureSystemFolder(projectId, source, db);

  // ── Create PENDING file row ────────────────────────────────────────────────
  const file = await db.vaultFile.create({
    data: {
      workspaceId,
      projectId,
      folderId: systemFolder.id,
      uploaderUserId,
      name,
      mimeType,
      sizeBytes: sizeBytes,
      s3Key: "", // will be updated below after we have the fileId
      status: "PENDING",
      source,
      sourceId,
    },
  });

  const s3Key = buildS3Key({
    workspaceId,
    projectId,
    source,
    sourceId,
    fileId: file.id,
    filename: name,
  });

  await db.vaultFile.update({ where: { id: file.id }, data: { s3Key } });

  // ── Generate presigned PUT URL ─────────────────────────────────────────────
  const presignedUrl = await generatePresignedPut({
    s3Key,
    sizeBytes,
    mimeType,
  });
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  logger.info("External file registered in vault", {
    fileId: file.id,
    source,
    sourceId,
    projectId,
  });

  return { fileId: file.id, presignedUrl, expiresAt };
}
