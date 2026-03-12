import type { PrismaClient } from "@prisma/client";
import type { PolicyStatement } from "./policy-types";

/**
 * Loads all applicable ResourcePolicy rows for a given (userId, resourceId) pair.
 *
 * ResourcePolicy schema (actual):
 *   userId        — the target user
 *   resourceId    — the resource being accessed
 *   permissionId  — FK to Permission table (which has resource + action fields)
 *   effect        — ALLOW | DENY
 *   conditions    — JSON condition block
 *
 * We join to the Permission table to get the action string,
 * and filter by userId (specific user) OR via principalType=ALL (not in this schema).
 */
export async function loadResourcePolicies(
  resourceId: string,
  userId: string,
  db: PrismaClient
): Promise<PolicyStatement[]> {
  const rows = await db.resourcePolicy.findMany({
    where: {
      resourceId,
      userId,
    },
    select: {
      effect: true,
      conditions: true,
      permission: {
        select: { action: true, resource: true },
      },
    },
  });

  return rows.map((r) => ({
    effect: r.effect as "ALLOW" | "DENY",
    action: `${r.permission.resource}:${r.permission.action}`,
    conditions: r.conditions as Record<string, unknown> | undefined,
    principalId: userId,
  }));
}
