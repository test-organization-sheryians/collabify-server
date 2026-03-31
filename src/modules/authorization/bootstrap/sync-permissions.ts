/**
 * sync-permissions.ts
 *
 * Stage 3 — Bootstrap: Permission Registry Sync.
 *
 * Upserts all Permission rows from every module's `permissions.ts` manifest
 * into the DB. Hash-gated via Redis: skips the upsert loop if the manifest
 * content hash hasn't changed since the last run.
 *
 * Guarantees:
 *   - Never deletes existing permissions (additive-only)
 *   - Safe to run on every server start (idempotent upserts)
 *   - Fast path when nothing has changed (hash check → Redis)
 *   - Skipped entirely when SKIP_PERMISSION_BOOTSTRAP=true
 */
import type { PrismaClient } from "@prisma/client";
import type { Redis } from "ioredis";
import { createHash } from "node:crypto";
import { createLogger } from "@/shared/lib/logger";

// ── Module permission manifests ──────────────────────────────────────────────
import { WORKSPACE_PERMISSIONS } from "@/modules/workspace/permissions";
import { PROJECT_PERMISSIONS } from "@/modules/project/permissions";
import { ISSUE_PERMISSIONS } from "@/modules/issues/permissions";
import { PAGE_PERMISSIONS } from "@/modules/pages/permissions";
import { BOARD_PERMISSIONS } from "@/modules/whiteboard/permissions";
import { CHAT_PERMISSIONS } from "@/modules/chat/permissions";
import { VAULT_PERMISSIONS } from "@/modules/vault/permissions";

const logger = createLogger("bootstrap:sync-permissions");

const REDIS_HASH_KEY = "bootstrap:perm-manifest-hash";

/** Collect all permissions from every module manifest */
function collectAllPermissions() {
  return [
    ...WORKSPACE_PERMISSIONS,
    ...PROJECT_PERMISSIONS,
    ...ISSUE_PERMISSIONS,
    ...PAGE_PERMISSIONS,
    ...BOARD_PERMISSIONS,
    ...CHAT_PERMISSIONS,
    ...VAULT_PERMISSIONS,
  ];
}

/** Compute a deterministic SHA-256 hash of the manifest content */
function hashManifest(
  permissions: ReturnType<typeof collectAllPermissions>
): string {
  const sorted = [...permissions].sort((a, b) =>
    `${a.resource}:${a.action}`.localeCompare(`${b.resource}:${b.action}`)
  );
  const content = JSON.stringify(sorted);
  return createHash("sha256").update(content).digest("hex");
}

export async function syncPermissions(
  db: PrismaClient,
  redis: Redis
): Promise<void> {
  const all = collectAllPermissions();
  const currentHash = hashManifest(all);

  // ── Fast path: check if manifest has changed since last boot ─────────────
  const storedHash = await redis.get(REDIS_HASH_KEY);
  if (storedHash === currentHash) {
    logger.info("Permission manifest unchanged — skipping DB sync", {
      hash: currentHash.slice(0, 8),
      count: all.length,
    });
    return;
  }

  // ── Slow path: upsert all permissions ────────────────────────────────────
  logger.info(`Syncing ${all.length} permissions to DB...`);
  let upserted = 0;

  for (const perm of all) {
    await db.permission.upsert({
      where: { resource_action: { resource: perm.resource, action: perm.action } },
      create: {
        resource: perm.resource,
        action: perm.action,
        description: perm.description,
        module: perm.module,
        hasConditions: perm.hasConditions ?? false,
      },
      update: {
        description: perm.description,
        module: perm.module,
        hasConditions: perm.hasConditions ?? false,
      },
    });
    upserted++;
  }

  // ── Update hash in Redis after successful sync ────────────────────────────
  await redis.set(REDIS_HASH_KEY, currentHash);
  logger.info(`Permission sync complete`, { upserted, hash: currentHash.slice(0, 8) });
}
