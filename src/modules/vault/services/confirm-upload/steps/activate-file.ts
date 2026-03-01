import type { PrismaClient, VaultFile } from "@prisma/client";
import { activateVaultUsage } from "../../../lib/quota-guard";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("vault:services:confirm-upload:activate");

export async function activateFile(
  file: VaultFile,
  db: PrismaClient
): Promise<VaultFile> {
  logger.debug("activate-file: setting ACTIVE + activating usage", {
    fileId: file.id,
    sizeBytes: file.sizeBytes.toString(),
    projectId: file.projectId,
    workspaceId: file.workspaceId,
  });

  const [updated] = await Promise.all([
    db.vaultFile.update({
      where: { id: file.id },
      data: { status: "ACTIVE", confirmedAt: new Date() },
    }),
    activateVaultUsage({
      projectId: file.projectId,
      workspaceId: file.workspaceId,
      sizeBytes: file.sizeBytes,
      db,
    }),
  ]);

  logger.debug("activate-file: done", {
    fileId: file.id,
    status: "ACTIVE",
  });

  return updated;
}
