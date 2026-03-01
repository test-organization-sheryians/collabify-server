import { enforceVaultQuota } from "../../../lib/quota-guard";
import type { PrismaClient } from "@prisma/client";

export async function checkQuota(
  projectId: string,
  workspaceId: string,
  sizeBytes: number,
  db: PrismaClient
): Promise<void> {
  await enforceVaultQuota({
    projectId,
    workspaceId,
    incomingSizeBytes: sizeBytes,
    db,
  });
}
