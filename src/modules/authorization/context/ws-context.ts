import type { PrismaClient } from "@prisma/client";
import type { Redis } from "ioredis";
import { AuthGate } from "../auth-gate/auth-gate";
import { PermissionEngine } from "../engine/permission-engine";
import { FeatureFlagEngine } from "../engine/feature-flag-engine";

export interface WSAuthContext {
  auth: AuthGate;
  permissions: PermissionEngine;
  flags: FeatureFlagEngine;
}

/**
 * Creates AuthGate + PermissionEngine + FeatureFlagEngine for a WebSocket connection.
 * Called by the WS context factory on socket connect.
 */
export function createWSAuthContext(
  userId: string,
  db: PrismaClient,
  redis: Redis,
  scopeIds?: { workspaceId?: string; projectId?: string }
): WSAuthContext {
  return {
    auth: new AuthGate(userId, db, redis),
    permissions: new PermissionEngine(userId, db, redis),
    flags: new FeatureFlagEngine(
      { userId, workspaceId: scopeIds?.workspaceId, projectId: scopeIds?.projectId },
      db,
      redis
    ),
  };
}
