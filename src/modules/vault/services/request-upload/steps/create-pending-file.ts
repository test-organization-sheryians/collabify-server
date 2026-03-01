import type { PrismaClient, VaultFile } from "@prisma/client";
import { buildS3Key } from "../../../lib/s3-keys";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("vault:services:request-upload:create");

interface CreatePendingFileInput {
  workspaceId: string;
  projectId: string;
  folderId?: string | null;
  uploaderUserId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

export async function createPendingFile(
  input: CreatePendingFileInput,
  db: PrismaClient
): Promise<VaultFile> {
  logger.info("create-pending-file: inserting PENDING row", {
    name: input.name,
    folderId: input.folderId ?? null,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
  });

  // Create with empty s3Key first to get the generated fileId
  const file = await db.vaultFile.create({
    data: {
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      folderId: input.folderId ?? null,
      uploaderUserId: input.uploaderUserId,
      name: input.name,
      mimeType: input.mimeType,
      sizeBytes: BigInt(input.sizeBytes),
      s3Key: "",
      status: "PENDING",
      source: "VAULT",
    },
  });

  // Build the s3Key now that we have the fileId
  const s3Key = buildS3Key({
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    source: "VAULT",
    sourceId: null,
    fileId: file.id,
    filename: input.name,
  });

  logger.info("create-pending-file: s3Key built", { fileId: file.id, s3Key });

  const updated = await db.vaultFile.update({
    where: { id: file.id },
    data: { s3Key },
  });

  logger.info("create-pending-file: done", { fileId: file.id });
  return updated;
}
