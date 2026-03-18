import type { PrismaClient } from "@prisma/client";
import type { Redis } from "ioredis";
import { AuthGate } from "../auth-gate/auth-gate";
import { PermissionEngine } from "../engine/permission-engine";

export interface WSAuthContext {
  auth: AuthGate;
  permissions: PermissionEngine;
}

/**
 * Creates AuthGate + PermissionEngine for a WebSocket connection.
 * Called by the WS context factory on socket connect.
 */
export function createWSAuthContext(
  userId: string,
  db: PrismaClient,
  redis: Redis
): WSAuthContext {
  return {
    auth: new AuthGate(userId, db, redis),
    permissions: new PermissionEngine(userId, db, redis),
  };
}
