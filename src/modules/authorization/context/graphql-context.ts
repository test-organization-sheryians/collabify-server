import type { PrismaClient } from "@prisma/client";
import type { Redis } from "ioredis";
import { AuthGate } from "../auth-gate/auth-gate";
import { PermissionEngine } from "../engine/permission-engine";
import { FeatureFlagEngine } from "../engine/feature-flag-engine";

export interface AuthContext {
  auth: AuthGate;
  permissions: PermissionEngine;
  flags: FeatureFlagEngine;
}

/**
 * Creates AuthGate + PermissionEngine + FeatureFlagEngine for a GraphQL request.
 * Called inside the GraphQL context factory.
 *
 * @param userId   - authenticated user id
 * @param scopeIds - optional workspace/project scope for flag resolution
 */
export function createGraphQLAuthContext(
  userId: string,
  db: PrismaClient,
  redis: Redis,
  scopeIds?: { workspaceId?: string; projectId?: string }
): AuthContext {
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
