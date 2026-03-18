import type { PrismaClient } from "@prisma/client";
import type { Redis } from "ioredis";
import { AuthGate } from "../auth-gate/auth-gate";
import { PermissionEngine } from "../engine/permission-engine";

export interface AuthContext {
  auth: AuthGate;
  permissions: PermissionEngine;
}

/**
 * Creates AuthGate + PermissionEngine instances for a GraphQL request.
 * Called inside the GraphQL context factory.
 */
export function createGraphQLAuthContext(
  userId: string,
  db: PrismaClient,
  redis: Redis
): AuthContext {
  return {
    auth: new AuthGate(userId, db, redis),
    permissions: new PermissionEngine(userId, db, redis),
  };
}
