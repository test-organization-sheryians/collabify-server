import type { PrismaClient } from "@prisma/client";
import { releaseVaultUsage } from "../../../lib/quota-guard";

export async function releaseUsage(
  projectId: string,
  workspaceId: string,
  sizeBytes: bigint,
  db: PrismaClient
): Promise<void> {
  await releaseVaultUsage({ projectId, workspaceId, sizeBytes, db });
}
