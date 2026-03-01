import { enforceVaultQuota } from "../../../lib/quota-guard";
import type { PrismaClient } from "@prisma/client";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("vault:services:request-upload:quota");

export async function checkQuota(
  projectId: string,
  workspaceId: string,
  sizeBytes: number,
  db: PrismaClient
): Promise<void> {
  logger.info("check-quota: enforcing quota", {
    projectId,
    workspaceId,
    sizeBytes,
  });

  await enforceVaultQuota({
    projectId,
    workspaceId,
    incomingSizeBytes: sizeBytes,
    db,
  });

  logger.info("check-quota: quota OK, bytes reserved");
}
