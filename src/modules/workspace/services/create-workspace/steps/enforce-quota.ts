/**
 * Enforce the MAX_OWNED_WORKSPACES quota for a user before workspace creation.
 *
 * Priority:
 *   1. If the user has a subscription → use plan limit or override
 *   2. No subscription → fall back to WORKSPACE_LIMITS.MAX_OWNED_WORKSPACES (hardcoded)
 *   3. Limit === -1 → unlimited
 *
 * Throws FORBIDDEN if quota is exceeded.
 * (Inlined from the deleted @/modules/quota/service module)
 */
import { AppError } from "@/shared/errors";
import { WORKSPACE_LIMITS } from "@/shared/config/limits";
import type { PrismaClient } from "@prisma/client";

async function countOwnedWorkspaces(
  userId: string,
  db: PrismaClient
): Promise<number> {
  return db.workspace.count({
    where: {
      members: { some: { userId, assignedRole: { name: "OWNER" } } },
      deletedAt: null,
    },
  });
}

export async function enforceQuota(
  userId: string,
  db: PrismaClient
): Promise<void> {
  const subscription = await db.subscription.findUnique({
    where: { userId },
    include: {
      plan: { include: { limits: true } },
      overrides: true,
    },
  });

  let limit: number;

  if (!subscription) {
    // No plan — fall back to hardcoded config limit
    const usage = await countOwnedWorkspaces(userId, db);
    if (usage >= WORKSPACE_LIMITS.MAX_OWNED_WORKSPACES) {
      throw AppError.forbidden(
        "Quota exceeded for MAX_OWNED_WORKSPACES. Please upgrade your plan."
      );
    }
    return;
  }

  // Plan is present — resolve limit via override > planLimit > unlimited
  const override = subscription.overrides.find(
    (o) => o.resourceKey === "MAX_OWNED_WORKSPACES"
  );
  const planLimit = subscription.plan.limits.find(
    (l) => l.resourceKey === "MAX_OWNED_WORKSPACES"
  );

  if (override) {
    limit = override.limitValue;
  } else if (planLimit) {
    limit = planLimit.limitValue;
  } else {
    limit = -1; // unlimited
  }

  if (limit === -1) return;

  const usage = await countOwnedWorkspaces(userId, db);
  if (usage >= limit) {
    throw AppError.forbidden(
      "Quota exceeded for MAX_OWNED_WORKSPACES. Please upgrade your plan."
    );
  }
}
