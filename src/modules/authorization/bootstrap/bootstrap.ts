/**
 * bootstrap.ts
 *
 * Stage 3 — Authorization Bootstrap Orchestrator.
 *
 * Coordinates the startup sequence for the authorization system:
 *   1. syncPermissions  — upsert Permission rows from module manifests (hash-gated)
 *   2. syncSystemRoles  — ensure WORKSPACE + PROJECT system roles exist per workspace
 *
 * Called once at server startup before accepting requests.
 * Respects SKIP_PERMISSION_BOOTSTRAP=true for fast local dev.
 */
import type { PrismaClient } from "@prisma/client";
import type { Redis } from "ioredis";
import { createLogger } from "@/shared/lib/logger";
import { syncPermissions } from "./sync-permissions";
import { syncSystemRoles } from "./sync-system-roles";

const logger = createLogger("bootstrap:authorization");

export async function runAuthBootstrap(
  db: PrismaClient,
  redis: Redis
): Promise<void> {
  if (process.env.SKIP_PERMISSION_BOOTSTRAP === "true") {
    logger.info("SKIP_PERMISSION_BOOTSTRAP=true — skipping authorization bootstrap");
    return;
  }

  const start = Date.now();
  logger.info("Starting authorization bootstrap...");

  try {
    // Step 1: Sync permissions from all module manifests (hash-gated, fast on repeat)
    await syncPermissions(db, redis);

    // Step 2: Ensure system roles + role-permissions exist per workspace
    await syncSystemRoles(db, redis);

    const elapsed = Date.now() - start;
    logger.info(`Authorization bootstrap complete`, { elapsedMs: elapsed });
  } catch (err) {
    // Bootstrap failure is non-fatal: server still starts, but permissions
    // may be stale. Log at error level — alert monitoring should fire.
    logger.error("Authorization bootstrap failed — server starting anyway", { err });
  }
}
