import type { PrismaClient } from "@prisma/client";
import { VAULT_LIMITS } from "../../../lib/constants";
import type { VaultUsageResult } from "../types";

const PROJECT = "PROJECT" as const;
const WORKSPACE = "WORKSPACE" as const;

export async function fetchUsage(
  projectId: string,
  db: PrismaClient
): Promise<VaultUsageResult> {
  // Get workspaceId from the project
  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { workspaceId: true },
  });

  const [projectRecord, workspaceRecord] = await Promise.all([
    db.vaultUsageRecord.findUnique({
      where: {
        workspaceId_projectId_scope: {
          workspaceId: project.workspaceId,
          projectId,
          scope: PROJECT,
        },
      },
    }),
    db.vaultUsageRecord.findFirst({
      where: {
        workspaceId: project.workspaceId,
        projectId: null,
        scope: WORKSPACE,
      },
    }),
  ]);

  const projectUsedBytes = projectRecord?.usedBytes ?? 0n;
  const projectReservedBytes = projectRecord?.reservedBytes ?? 0n;
  const projectFileCount = projectRecord?.fileCount ?? 0;
  const workspaceUsedBytes = workspaceRecord?.usedBytes ?? 0n;
  const workspaceReservedBytes = workspaceRecord?.reservedBytes ?? 0n;
  const workspaceFileCount = workspaceRecord?.fileCount ?? 0;

  const percentUsed =
    (Number(projectUsedBytes) /
      Number(VAULT_LIMITS.MAX_PROJECT_STORAGE_BYTES)) *
    100;

  return {
    projectUsedBytes,
    projectReservedBytes,
    projectLimitBytes: VAULT_LIMITS.MAX_PROJECT_STORAGE_BYTES,
    projectFileCount,
    projectFileCountLimit: VAULT_LIMITS.MAX_PROJECT_FILE_COUNT,
    workspaceUsedBytes,
    workspaceReservedBytes,
    workspaceLimitBytes: VAULT_LIMITS.MAX_WORKSPACE_STORAGE_BYTES,
    workspaceFileCount,
    workspaceFileCountLimit: VAULT_LIMITS.MAX_WORKSPACE_FILE_COUNT,
    percentUsed: Math.min(percentUsed, 100),
  };
}
