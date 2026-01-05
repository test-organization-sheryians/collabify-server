import { db } from "../../infra/db";
import { AppError } from "../../shared/errors";
import { WORKSPACE_LIMITS } from "../../shared/config/limits";

type ResourceType = "MAX_OWNED_WORKSPACES" | "MAX_MEMBERS_PER_WORKSPACE";

export const QuotaService = {
  /**
   * Enforces a quota check. Throws 403 if exceeded.
   */
  async enforceQuota(userId: string, resourceKey: ResourceType) {
    const allowed = await this.checkQuota(userId, resourceKey);
    if (!allowed) {
      throw AppError.forbidden(
        `Quota exceeded for ${resourceKey}. Please upgrade your plan.`
      );
    }
  },

  /**
   * Checks if a user has sufficient quota for a resource.
   */
  async checkQuota(
    userId: string,
    resourceKey: ResourceType
  ): Promise<boolean> {
    // 1. Resolve Plan
    const subscription = await db.subscription.findUnique({
      where: { userId },
      include: {
        plan: {
          include: { limits: true },
        },
        overrides: true,
      },
    });

    let limit = -1; // Default unlimited if no rules found (Dangerous? Maybe default to 0?)

    // Fallback to Hardcoded Limits if no DB Plan (Migration/Safety)
    if (!subscription) {
      // Map resource key to config limits
      if (resourceKey === "MAX_OWNED_WORKSPACES")
        return await this.checkHardcoded(
          userId,
          WORKSPACE_LIMITS.MAX_OWNED_WORKSPACES
        );
      return true;
    }

    // 2. Determine Limit
    // Priority: Subscription Override > Plan Limit > Global Default
    const override = subscription.overrides.find(
      (o) => o.resourceKey === resourceKey
    );
    const planLimit = subscription.plan.limits.find(
      (l) => l.resourceKey === resourceKey
    );

    if (override) {
      limit = override.limitValue;
    } else if (planLimit) {
      limit = planLimit.limitValue;
    }

    // Unlimited check
    if (limit === -1) return true;

    // 3. Calculate Usage
    const usage = await this.calculateUsage(userId, resourceKey);

    return usage < limit;
  },

  async calculateUsage(
    userId: string,
    resourceKey: ResourceType
  ): Promise<number> {
    if (resourceKey === "MAX_OWNED_WORKSPACES") {
      return db.workspace.count({
        where: {
          members: { some: { userId, role: "OWNER" } },
          deletedAt: null,
        },
      });
    }
    // Add other resource types here
    return 0;
  },

  // Helper for users without a plan (Fallback Phase)
  async checkHardcoded(userId: string, max: number): Promise<boolean> {
    const usage = await this.calculateUsage(userId, "MAX_OWNED_WORKSPACES");
    return usage < max;
  },
};
