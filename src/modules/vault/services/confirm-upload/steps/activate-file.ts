import type { PrismaClient, VaultFile } from "@prisma/client";
import { activateVaultUsage } from "../../../lib/quota-guard";

export async function activateFile(
  file: VaultFile,
  db: PrismaClient
): Promise<VaultFile> {
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

  return updated;
}
