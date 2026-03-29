/**
 * VaultQuotaGuard — enforces storage limits before and after uploads.
 *
 * Uses reservedBytes to prevent TOCTOU races on concurrent uploads.
 * See vault-quota-and-limits.md §3 for the full design rationale.
 *
 * Uses two dedicated models:
 *   VaultProjectUsage   — per-project row (compound PK: workspaceId + projectId)
 *   VaultWorkspaceUsage — per-workspace row (unique on workspaceId)
 *
 * All operations use Prisma's typed API — no $executeRaw required.
 *
 * All three functions wrap their reads + writes in db.$transaction so that
 * concurrent uploads cannot race past the quota check before a reservation lands.
 * Callers inside an existing transaction may pass the Prisma Tx client as `db`.
 */

import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { PrismaClient } from "@prisma/client";
import { VAULT_LIMITS } from "./constants";

const logger = createLogger("vault:lib:quota-guard");

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
 *
 * All reads and writes run inside a single db.$transaction to prevent the TOCTOU
 * race where two concurrent uploads both pass the check before either reservation
 * lands in the DB.
 */
export async function enforceVaultQuota({
  projectId,
  workspaceId,
  incomingSizeBytes,
  db,
}: EnforceQuotaInput): Promise<void> {
  const incoming = BigInt(incomingSizeBytes);

  logger.debug("enforceVaultQuota: checking limits", {
    projectId,
    workspaceId,
    incomingSizeBytes,
  });

  await db.$transaction(async (tx) => {
    // Fetch both records inside the transaction so reads + writes are atomic
    const [projectRecord, workspaceRecord] = await Promise.all([
      tx.vaultProjectUsage.findUnique({
        where: { workspaceId_projectId: { workspaceId, projectId } },
      }),
      tx.vaultWorkspaceUsage.findUnique({
        where: { workspaceId },
      }),
    ]);

    const projectUsed = projectRecord?.usedBytes ?? 0n;
    const projectReserved = projectRecord?.reservedBytes ?? 0n;
    const projectFileCount = projectRecord?.fileCount ?? 0;

    const workspaceUsed = workspaceRecord?.usedBytes ?? 0n;
    const workspaceReserved = workspaceRecord?.reservedBytes ?? 0n;
    const workspaceFileCount = workspaceRecord?.fileCount ?? 0;

    logger.debug("enforceVaultQuota: current usage", {
      project: {
        usedBytes: projectUsed.toString(),
        reservedBytes: projectReserved.toString(),
        fileCount: projectFileCount,
      },
      workspace: {
        usedBytes: workspaceUsed.toString(),
        reservedBytes: workspaceReserved.toString(),
        fileCount: workspaceFileCount,
      },
      incoming: incoming.toString(),
    });

    // File count check
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

    // Atomically reserve bytes on both records
    logger.debug("enforceVaultQuota: reserving bytes", {
      incoming: incoming.toString(),
    });

    await Promise.all([
      tx.vaultProjectUsage.upsert({
        where: { workspaceId_projectId: { workspaceId, projectId } },
        update: { reservedBytes: { increment: incoming } },
        create: { workspaceId, projectId, reservedBytes: incoming },
      }),
      tx.vaultWorkspaceUsage.upsert({
        where: { workspaceId },
        update: { reservedBytes: { increment: incoming } },
        create: { workspaceId, reservedBytes: incoming },
      }),
    ]);
  });
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
 *
 * Accepts either PrismaClient or a Prisma Tx client so callers inside an
 * existing db.$transaction can pass `tx` directly — ensuring the activation
 * is rolled back if the outer transaction fails.
 */
export async function activateVaultUsage({
  projectId,
  workspaceId,
  sizeBytes,
  db,
}: ActivateUsageInput): Promise<void> {
  logger.debug("activateVaultUsage: decrement reserved, increment used", {
    projectId,
    workspaceId,
    sizeBytes: sizeBytes.toString(),
  });

  await db.$transaction([
    db.vaultProjectUsage.update({
      where: { workspaceId_projectId: { workspaceId, projectId } },
      data: {
        reservedBytes: { decrement: sizeBytes },
        usedBytes: { increment: sizeBytes },
        fileCount: { increment: 1 },
      },
    }),
    db.vaultWorkspaceUsage.update({
      where: { workspaceId },
      data: {
        reservedBytes: { decrement: sizeBytes },
        usedBytes: { increment: sizeBytes },
        fileCount: { increment: 1 },
      },
    }),
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
 */
export async function releaseVaultUsage({
  projectId,
  workspaceId,
  sizeBytes,
  db,
}: ReleaseUsageInput): Promise<void> {
  logger.debug("releaseVaultUsage: decrement used + fileCount", {
    projectId,
    workspaceId,
    sizeBytes: sizeBytes.toString(),
  });

  await db.$transaction([
    db.vaultProjectUsage.update({
      where: { workspaceId_projectId: { workspaceId, projectId } },
      data: {
        usedBytes: { decrement: sizeBytes },
        fileCount: { decrement: 1 },
      },
    }),
    db.vaultWorkspaceUsage.update({
      where: { workspaceId },
      data: {
        usedBytes: { decrement: sizeBytes },
        fileCount: { decrement: 1 },
      },
    }),
  ]);
}
