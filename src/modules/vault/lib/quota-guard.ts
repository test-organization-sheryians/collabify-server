/**
 * VaultQuotaGuard — enforces storage limits before and after uploads.
 *
 * Uses reservedBytes to prevent TOCTOU races on concurrent uploads.
 * See vault-quota-and-limits.md §3 for the full design rationale.
 */

import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";
import { VAULT_LIMITS } from "./constants";

const { PROJECT, WORKSPACE } = {
  PROJECT: "PROJECT",
  WORKSPACE: "WORKSPACE",
} as const;

// ── Enforce Quota ──────────────────────────────────────────────────────────────

interface EnforceQuotaInput {
  projectId: string;
  workspaceId: string;
  incomingSizeBytes: number;
  db: PrismaClient;
}

/**
 * Checks both PROJECT and WORKSPACE quota simultaneously.
 * If either is exceeded, throws 403 before issuing the presigned URL.
 *
 * On success, atomically increments reservedBytes on both records
 * so concurrent uploads see each other's reservations.
 */
export async function enforceVaultQuota({
  projectId,
  workspaceId,
  incomingSizeBytes,
  db,
}: EnforceQuotaInput): Promise<void> {
  const incoming = BigInt(incomingSizeBytes);

  // Fetch both records in parallel (may be null for new projects)
  const [projectRecord, workspaceRecord] = await Promise.all([
    db.vaultUsageRecord.findUnique({
      where: {
        workspaceId_projectId_scope: {
          workspaceId,
          projectId,
          scope: PROJECT,
        },
      },
    }),
    db.vaultUsageRecord.findFirst({
      where: {
        workspaceId,
        projectId: null,
        scope: WORKSPACE,
      },
    }),
  ]);

  const projectUsed = projectRecord?.usedBytes ?? 0n;
  const projectReserved = projectRecord?.reservedBytes ?? 0n;
  const projectFileCount = projectRecord?.fileCount ?? 0;

  const workspaceUsed = workspaceRecord?.usedBytes ?? 0n;
  const workspaceReserved = workspaceRecord?.reservedBytes ?? 0n;
  const workspaceFileCount = workspaceRecord?.fileCount ?? 0;

  // File count check (against project limit)
  if (projectFileCount >= VAULT_LIMITS.MAX_PROJECT_FILE_COUNT) {
    throw AppError.forbidden(
      `Project file limit reached (${VAULT_LIMITS.MAX_PROJECT_FILE_COUNT.toLocaleString()} files)`
    );
  }
  if (workspaceFileCount >= VAULT_LIMITS.MAX_WORKSPACE_FILE_COUNT) {
    throw AppError.forbidden(
      `Workspace file limit reached (${VAULT_LIMITS.MAX_WORKSPACE_FILE_COUNT.toLocaleString()} files)`
    );
  }

  // Storage byte check
  if (
    projectUsed + projectReserved + incoming >
    VAULT_LIMITS.MAX_PROJECT_STORAGE_BYTES
  ) {
    throw AppError.forbidden("Project storage limit exceeded");
  }
  if (
    workspaceUsed + workspaceReserved + incoming >
    VAULT_LIMITS.MAX_WORKSPACE_STORAGE_BYTES
  ) {
    throw AppError.forbidden("Workspace storage limit exceeded");
  }

  // Atomically reserve bytes on both records before issuing presigned URL
  await Promise.all([
    db.vaultUsageRecord.upsert({
      where: {
        workspaceId_projectId_scope: { workspaceId, projectId, scope: PROJECT },
      },
      update: { reservedBytes: { increment: incoming } },
      create: {
        workspaceId,
        projectId,
        scope: PROJECT,
        reservedBytes: incoming,
      },
    }),
    // Raw SQL for workspace scope — Prisma typed API cannot express NULL in compound unique
    db.$executeRaw`
      INSERT INTO vault_usage_records (id, workspace_id, project_id, scope, reserved_bytes)
      VALUES (gen_random_uuid()::text, ${workspaceId}, NULL, 'WORKSPACE', ${incoming})
      ON CONFLICT (workspace_id, project_id, scope)
      DO UPDATE SET reserved_bytes = vault_usage_records.reserved_bytes + ${incoming}
    `,
  ]);
}

// ── Activate Usage (called by confirm-upload) ──────────────────────────────────

interface ActivateUsageInput {
  projectId: string;
  workspaceId: string;
  sizeBytes: bigint;
  db: PrismaClient;
}

/**
 * Decrement reservedBytes and increment usedBytes + fileCount atomically.
 * Called after S3 HeadObject verification in confirm-upload.
 */
export async function activateVaultUsage({
  projectId,
  workspaceId,
  sizeBytes,
  db,
}: ActivateUsageInput): Promise<void> {
  await Promise.all([
    db.vaultUsageRecord.update({
      where: {
        workspaceId_projectId_scope: { workspaceId, projectId, scope: PROJECT },
      },
      data: {
        reservedBytes: { decrement: sizeBytes },
        usedBytes: { increment: sizeBytes },
        fileCount: { increment: 1 },
      },
    }),
    db.$executeRaw`
      UPDATE vault_usage_records
      SET reserved_bytes = reserved_bytes - ${sizeBytes},
          used_bytes = used_bytes + ${sizeBytes},
          file_count = file_count + 1
      WHERE workspace_id = ${workspaceId}
        AND project_id IS NULL
        AND scope = 'WORKSPACE'
    `,
  ]);
}

// ── Release Usage (called by delete-file) ─────────────────────────────────────

interface ReleaseUsageInput {
  projectId: string;
  workspaceId: string;
  sizeBytes: bigint;
  db: PrismaClient;
}

/**
 * Decrement usedBytes + fileCount when a file is soft-deleted.
 * Uses Math.max guard via clamp to prevent negative counters from bugs.
 */
export async function releaseVaultUsage({
  projectId,
  workspaceId,
  sizeBytes,
  db,
}: ReleaseUsageInput): Promise<void> {
  await Promise.all([
    db.vaultUsageRecord.update({
      where: {
        workspaceId_projectId_scope: { workspaceId, projectId, scope: PROJECT },
      },
      data: {
        usedBytes: { decrement: sizeBytes },
        fileCount: { decrement: 1 },
      },
    }),
    db.$executeRaw`
      UPDATE vault_usage_records
      SET used_bytes = GREATEST(0, used_bytes - ${sizeBytes}),
          file_count = GREATEST(0, file_count - 1)
      WHERE workspace_id = ${workspaceId}
        AND project_id IS NULL
        AND scope = 'WORKSPACE'
    `,
  ]);
}
